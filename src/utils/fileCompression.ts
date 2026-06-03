export const MAX_FILE_SIZES = {
  'application/pdf': 10 * 1024 * 1024,
  'image/jpeg': 5 * 1024 * 1024,
  'image/jpg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
};

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export function isAllowedFileType(file: File): boolean {
  return ALLOWED_FILE_TYPES.includes(file.type);
}

export function validateFileSize(file: File): boolean {
  const maxSize = MAX_FILE_SIZES[file.type as keyof typeof MAX_FILE_SIZES] || 10 * 1024 * 1024;
  return file.size <= maxSize;
}

export async function compressImage(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.85
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onerror = () => reject(new Error('Failed to read file'));

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onerror = () => reject(new Error('Failed to load image'));

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            if (compressedFile.size < file.size) {
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
    };
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export async function prepareFileForUpload(file: File): Promise<File> {
  if (!isAllowedFileType(file)) {
    throw new Error('INVALID_FILE_TYPE');
  }

  let processedFile = file;

  if (file.type.startsWith('image/')) {
    processedFile = await compressImage(file);
  }

  if (!validateFileSize(processedFile)) {
    throw new Error('FILE_TOO_LARGE');
  }

  return processedFile;
}
