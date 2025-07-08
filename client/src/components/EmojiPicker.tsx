import React, { useEffect, useRef } from "react";
import "emoji-picker-element";

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  visible: boolean;
  onClose: () => void;
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, visible, onClose }) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    // @ts-ignore: Custom element type
    const picker = pickerRef.current?.querySelector('emoji-picker');
    if (picker) {
      const handler = (event: any) => {
        onSelect(event.detail.unicode);
        onClose();
      };
      picker.addEventListener("emoji-click", handler);
      return () => picker.removeEventListener("emoji-click", handler);
    }
  }, [visible, onSelect, onClose]);

  if (!visible) return null;
  return (
    <div style={{ position: "absolute", bottom: "50px", right: "20px", zIndex: 1000 }} ref={pickerRef}>
      {/* @ts-ignore: Custom element type */}
      <emoji-picker></emoji-picker>
    </div>
  );
};

export default EmojiPicker;
