export type BiometricResult = {
    credentialId: string;
};

const STORAGE_KEY = "spendx-biometric-credential";

/**
 * Convert binary data to Base64URL format.
 */
function toBase64Url(bytes: ArrayBuffer): string {
    const binary = String.fromCharCode(
        ...new Uint8Array(bytes)
    );

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

/**
 * Convert Base64URL back to binary data.
 */
function fromBase64Url(value: string): Uint8Array {
    const base64 = value
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
        base64 +
        "=".repeat((4 - (base64.length % 4)) % 4);

    const binary = atob(padded);

    return Uint8Array.from(
        binary,
        (character) => character.charCodeAt(0)
    );
}

/**
 * Generate cryptographically secure random bytes.
 */
function randomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);

    crypto.getRandomValues(bytes);

    return bytes;
}

/**
 * Convert Uint8Array into a standalone ArrayBuffer.
 *
 * This avoids TypeScript's ArrayBufferLike / SharedArrayBuffer
 * type conflicts with the WebAuthn API.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);

    new Uint8Array(buffer).set(bytes);

    return buffer;
}

/**
 * Get the WebAuthn PublicKeyCredential API when available.
 */
function getPublicKeyCredential(): typeof PublicKeyCredential | null {
    if (
        typeof window === "undefined" ||
        !window.isSecureContext ||
        !("PublicKeyCredential" in window) ||
        !navigator.credentials
    ) {
        return null;
    }

    return window.PublicKeyCredential;
}

/**
 * Check whether this browser/device supports
 * a user-verifying platform authenticator.
 *
 * Examples:
 * - Fingerprint
 * - Face authentication
 * - Windows Hello
 * - Device PIN/passcode where exposed as a platform authenticator
 */
export async function isBiometricSupported(): Promise<boolean> {
    const credentialApi = getPublicKeyCredential();

    if (!credentialApi) {
        return false;
    }

    try {
        return await credentialApi.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

/**
 * Get the credential ID stored for this device.
 */
export function getStoredBiometricCredentialId(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem(STORAGE_KEY);
}

/**
 * Remove the stored biometric credential ID.
 */
export function clearStoredBiometricCredential(): void {
    if (typeof window === "undefined") {
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Register a biometric/platform authenticator for the user.
 */
export async function registerBiometric(
    userId: string,
    email: string,
    displayName: string
): Promise<BiometricResult> {
    const credentialApi = getPublicKeyCredential();

    if (!credentialApi) {
        throw new Error(
            "Biometric authentication requires a secure connection and a supported browser."
        );
    }

    const platformAuthenticatorAvailable =
        await credentialApi.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!platformAuthenticatorAvailable) {
        throw new Error(
            "Biometric authentication is not available on this device."
        );
    }

    const existingCredentialId =
        getStoredBiometricCredentialId();

    /**
     * Convert all WebAuthn binary values to ArrayBuffer.
     * This prevents TypeScript errors caused by newer
     * ArrayBufferLike typings.
     */
    const userIdBuffer = toArrayBuffer(
        new TextEncoder().encode(userId)
    );

    const challengeBuffer = toArrayBuffer(
        randomBytes(32)
    );

    const credential = (await navigator.credentials.create({
        publicKey: {
            challenge: challengeBuffer,

            rp: {
                id: window.location.hostname,
                name: "SpendX",
            },

            user: {
                id: userIdBuffer,
                name: email || userId,
                displayName:
                    displayName || "SpendX User",
            },

            pubKeyCredParams: [
                {
                    type: "public-key",
                    alg: -7,
                },
                {
                    type: "public-key",
                    alg: -257,
                },
            ],

            authenticatorSelection: {
                authenticatorAttachment: "platform",
                residentKey: "preferred",
                userVerification: "required",
            },

            timeout: 60_000,

            attestation: "none",

            ...(existingCredentialId
                ? {
                    excludeCredentials: [
                        {
                            type: "public-key" as const,
                            id: toArrayBuffer(
                                fromBase64Url(
                                    existingCredentialId
                                )
                            ),
                        },
                    ],
                }
                : {}),
        },
    })) as PublicKeyCredential | null;

    if (!credential) {
        throw new Error(
            "The biometric registration was not completed."
        );
    }

    const credentialId = toBase64Url(
        credential.rawId
    );

    /**
     * The private key remains inside the device authenticator.
     *
     * SpendX only stores the credential ID so that the
     * browser can request this credential again.
     */
    localStorage.setItem(
        STORAGE_KEY,
        credentialId
    );

    return {
        credentialId,
    };
}

/**
 * Request biometric/platform authentication.
 */
export async function authenticateBiometric(): Promise<boolean> {
    const credentialApi = getPublicKeyCredential();

    const storedCredentialId =
        getStoredBiometricCredentialId();

    if (!credentialApi || !storedCredentialId) {
        return false;
    }

    try {
        const challengeBuffer = toArrayBuffer(
            randomBytes(32)
        );

        const credential = await navigator.credentials.get({
            publicKey: {
                challenge: challengeBuffer,

                rpId: window.location.hostname,

                allowCredentials: [
                    {
                        type: "public-key",

                        id: toArrayBuffer(
                            fromBase64Url(
                                storedCredentialId
                            )
                        ),
                    },
                ],

                userVerification: "required",

                timeout: 60_000,
            },
        });

        return credential instanceof PublicKeyCredential;
    } catch (error) {
        /**
         * User cancellation, timeout, unavailable
         * authenticator, or failed verification.
         */
        console.error(
            "Biometric authentication failed:",
            error
        );

        return false;
    }
}