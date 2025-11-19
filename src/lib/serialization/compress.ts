import * as LZString from "lz-string";
import * as pako from "pako";

/**
 * Compression method to use
 * - "lz-string": Optimized for URL compression, smaller output
 * - "pako": Standard gzip compression
 */
const COMPRESSION_METHOD: "lz-string" | "pako" = "lz-string";

// ============================================================================
// LZ-STRING IMPLEMENTATION (Optimized for URLs)
// ============================================================================

/**
 * Compresses a string using lz-string (optimized for URLs)
 * @param input - The string to compress
 * @returns URL-safe compressed string
 */
export function compressLZString(input: string): string {
  try {
    return LZString.compressToEncodedURIComponent(input);
  } catch (error) {
    throw new Error(
      `LZ-String compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decompresses a lz-string compressed string
 * @param input - URL-safe compressed string
 * @returns Decompressed string
 */
export function decompressLZString(input: string): string {
  try {
    const result = LZString.decompressFromEncodedURIComponent(input);
    if (result === null || result === "") {
      throw new Error("Decompression returned null or empty string");
    }
    return result;
  } catch (error) {
    throw new Error(
      `LZ-String decompression failed: ${error instanceof Error ? error.message : "Unknown error"}. The URL may be corrupted or invalid.`,
    );
  }
}

// ============================================================================
// PAKO IMPLEMENTATION (Standard gzip)
// ============================================================================

/**
 * Compresses a string using gzip and encodes as URL-safe base64
 * @param input - The string to compress
 * @returns URL-safe base64 encoded compressed string
 */
export function compressPako(input: string): string {
  try {
    // Convert string to Uint8Array
    const inputBytes = new TextEncoder().encode(input);

    // Compress using gzip
    const compressed = pako.deflate(inputBytes, { level: 9 }); // Maximum compression

    // Convert to base64
    let binaryString = "";
    for (let i = 0; i < compressed.length; i++) {
      binaryString += String.fromCharCode(compressed[i]);
    }
    const base64 = btoa(binaryString);

    // Make URL-safe by replacing characters
    const urlSafe = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, ""); // Remove padding

    return urlSafe;
  } catch (error) {
    throw new Error(
      `Pako compression failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Decompresses a URL-safe base64 encoded gzip string
 * @param input - URL-safe base64 encoded compressed string
 * @returns Decompressed string
 */
export function decompressPako(input: string): string {
  try {
    // Convert from URL-safe base64 to standard base64
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    // Decode base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress using gzip
    const decompressed = pako.inflate(bytes);

    // Convert Uint8Array back to string
    const output = new TextDecoder().decode(decompressed);

    return output;
  } catch (error) {
    throw new Error(
      `Pako decompression failed: ${error instanceof Error ? error.message : "Unknown error"}. The URL may be corrupted or invalid.`,
    );
  }
}

// ============================================================================
// MAIN API (uses selected compression method)
// ============================================================================

/**
 * Compresses a string using the configured compression method
 * @param input - The string to compress
 * @returns URL-safe compressed string
 */
export function compress(input: string): string {
  if (COMPRESSION_METHOD === "lz-string") {
    return compressLZString(input);
  } else {
    return compressPako(input);
  }
}

/**
 * Decompresses a string using the configured compression method
 * @param input - URL-safe compressed string
 * @returns Decompressed string
 */
export function decompress(input: string): string {
  if (COMPRESSION_METHOD === "lz-string") {
    return decompressLZString(input);
  } else {
    return decompressPako(input);
  }
}
