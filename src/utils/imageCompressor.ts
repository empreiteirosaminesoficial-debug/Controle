/**
 * Compresses an image file to a lightweight web-friendly data URL
 * to ensure smooth rendering and safe client-side persistence.
 */
export async function compressImageFile(file: File, maxDimension = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp with fallback to jpeg
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // fallback
        }

        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData);
      };
      img.onerror = () => reject(new Error('Erro ao carregar a imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'));
    reader.readAsDataURL(file);
  });
}
