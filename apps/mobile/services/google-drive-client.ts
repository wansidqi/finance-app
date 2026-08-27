import { DriveBackupFile } from "@/interface/backup";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { Directory, File } from "expo-file-system";

// `drive.appdata` is the least-privilege scope that still lets us store
// backups: it grants access only to a hidden, per-app folder the user can't
// browse in the regular Drive UI (and other apps can't see), never general
// access to the rest of their Drive. Matches plan.md's "least-privilege
// permissions" principle.
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error(
      "Google Drive backup isn't configured yet — missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.",
    );
  }

  GoogleSignin.configure({
    webClientId,
    scopes: [DRIVE_SCOPE],
    offlineAccess: false,
  });
  configured = true;
}

export function isGoogleDriveConnected(): boolean {
  ensureConfigured();
  return GoogleSignin.hasPreviousSignIn();
}

export function getConnectedAccountEmail(): string | null {
  ensureConfigured();
  return GoogleSignin.getCurrentUser()?.user.email ?? null;
}

/** Opens the account picker / consent flow. Returns the connected account's email. */
export async function connectGoogleDrive(): Promise<string> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error("Google sign-in was cancelled");
  }
  return response.data.user.email;
}

export async function disconnectGoogleDrive(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.revokeAccess().catch(() => {
    // Revoke can fail if the grant was already revoked server-side (e.g. the
    // user removed access from their Google Account settings) — sign-out
    // below is what actually matters for local state.
  });
  await GoogleSignin.signOut();
}

async function getAccessToken(): Promise<string> {
  ensureConfigured();
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

/** Uploads `file` into the app's hidden appDataFolder, returning the new Drive file ID. */
export async function uploadBackupFile(file: File, mimeType: string): Promise<string> {
  const accessToken = await getAccessToken();
  const base64Content = await file.base64();
  const boundary = "finance-app-backup-boundary";
  const metadata = JSON.stringify({ name: file.name, parents: ["appDataFolder"] });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n${base64Content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.id as string;
}

/** Lists every backup file in the app's hidden appDataFolder, newest first. */
export async function listBackupFiles(): Promise<DriveBackupFile[]> {
  const accessToken = await getAccessToken();
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    fields: "files(id,name,size,createdTime)",
    orderBy: "createdTime desc",
    pageSize: "100",
  });

  const res = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive list failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  const files: { id: string; name: string; size?: string; createdTime: string }[] =
    json.files ?? [];

  return files.map((f) => ({
    driveFileId: f.id,
    filename: f.name,
    sizeBytes: Number(f.size ?? 0),
    createdAt: f.createdTime,
  }));
}

/** Downloads a Drive backup file directly to `destination` on disk. */
export async function downloadBackupFile(
  driveFileId: string,
  destination: File | Directory,
): Promise<File> {
  const accessToken = await getAccessToken();
  const downloaded = await File.downloadFileAsync(
    `${DRIVE_API}/files/${driveFileId}?alt=media`,
    destination,
    { headers: { Authorization: `Bearer ${accessToken}` }, idempotent: true },
  );
  // downloadFileAsync's own type declares the (structurally narrower) base
  // File type rather than this module's subclass — re-wrap by URI so
  // callers get the full File API (.name, etc.) consistently.
  return new File(downloaded.uri);
}

export async function deleteBackupFile(driveFileId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${DRIVE_API}/files/${driveFileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive delete failed (${res.status}): ${await res.text()}`);
  }
}
