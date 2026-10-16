"use client";

import { useEffect, useState } from "react";

export function PhotoField({ required = true, label = "Photo of the person and their holiday apparel" }: { required?: boolean; label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <label className="field">
      {label}
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        required={required}
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      {preview ? <img className="preview" src={preview} alt="" /> : null}
    </label>
  );
}
