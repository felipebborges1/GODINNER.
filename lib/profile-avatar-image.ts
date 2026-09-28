import { avatarImageRequirements } from "@/lib/supabase/storage";

export type SourceImage = { file: File; url: string; width: number; height: number };

export function readProfileImage(file: File) {
  return new Promise<SourceImage>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({ file, width: image.naturalWidth, height: image.naturalHeight, url });
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler esta imagem.")); };
    image.src = url;
  });
}

export function cropProfileImage(source: SourceImage, position: number) {
  return new Promise<File>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const side = Math.min(source.width, source.height);
      const offset = Math.round((Math.abs(source.width - source.height) * position) / 100);
      const canvas = document.createElement("canvas");
      const outputSide = Math.min(side, avatarImageRequirements.maxOutputDimension);
      canvas.width = outputSide;
      canvas.height = outputSide;
      const context = canvas.getContext("2d");
      if (!context) { reject(new Error("Não foi possível preparar o recorte.")); return; }
      context.drawImage(image, source.width > source.height ? offset : 0, source.height > source.width ? offset : 0, side, side, 0, 0, outputSide, outputSide);
      canvas.toBlob((blob) => {
        if (!blob || !avatarImageRequirements.acceptedTypes.has(blob.type)) { reject(new Error("Não foi possível preparar o recorte.")); return; }
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/png" ? "png" : "webp";
        const cropped = new File([blob], `avatar.${extension}`, { type: blob.type });
        if (cropped.size > avatarImageRequirements.maxBytes) { reject(new Error("A foto processada ficou maior que 5 MB. Escolha outra imagem.")); return; }
        resolve(cropped);
      }, "image/webp", 0.86);
    };
    image.onerror = () => reject(new Error("Não foi possível preparar o recorte."));
    image.src = source.url;
  });
}
