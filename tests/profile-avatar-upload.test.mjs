import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storage = await readFile(new URL("../lib/supabase/storage.ts", import.meta.url), "utf8");
const editor = await readFile(new URL("../components/profile/profile-avatar-editor.tsx", import.meta.url), "utf8");
const context = await readFile(new URL("../context/app-context.tsx", import.meta.url), "utf8");

test("profile avatar crop limits output before private Storage upload", () => {
  assert.match(storage, /maxOutputDimension: AVATAR_MAX_OUTPUT_DIMENSION/);
  assert.match(editor, /Math\.min\(side, avatarImageRequirements\.maxOutputDimension\)/);
  assert.match(editor, /cropped\.size > avatarImageRequirements\.maxBytes/);
  assert.match(editor, /"image\/webp", 0\.86/);
});

test("profile avatar upload preserves MIME and gives safe actionable errors", () => {
  assert.match(storage, /createSafeStoragePath\(userId, file, "avatars"\)/);
  assert.match(storage, /if \(type === "image\/jpeg"\) return "jpg"/);
  assert.match(storage, /Sua sessão expirou\. Entre novamente para enviar sua foto\./);
  assert.match(storage, /A foto processada ficou maior que 5 MB\./);
  assert.match(context, /getAvatarUploadErrorMessage\(uploaded\.error\)/);
});
