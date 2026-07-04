import Image from 'next/image';

export default function Logo() {
  // The logo image is placed in the public folder, so it can be referenced via the root path.
  // Width/height are set to maintain aspect ratio; adjust as needed for design.
  return (
    <Image
      src="/logo_horizontal_final.png"
      alt="el-town ロゴ"
      width={200}
      height={60}
      priority
    />
  );
}
