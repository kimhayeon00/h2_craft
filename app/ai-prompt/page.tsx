'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

type Prompt = {
  id: number;
  title: string;
  image: string | null;
  description: string;
  content: string;
};

const prompts: Prompt[] = [
  {
    id: 1,
    title: '뜨개 인형 만들기',
    image: '/images/prompts/jihoon.jpeg',
    description: '사진 속 인물을 귀여운 뜨개 인형으로 변환해주는 프롬프트!',
    content: `Transform the subject from the input photo into a two-step, single-output result:
(1) first reinterpret them as a collectible designer-toy style 3D cartoon character, then
(2) reinterpret that character as a realistic handmade crochet amigurumi doll — and output ONLY the final crochet doll product photo.
KEEP (pose & framing):
• Keep the exact pose, camera angle, and framing style from the original photo.
• The character must remain centered and in the same placement.
• Full-body must be fully visible: head to toe, including shoes/feet — absolutely no cropping.
• If necessary, zoom out slightly to ensure the entire doll is visible while preserving the same pose and overall composition.

STEP 1 — Designer-toy 3D character (internal step, do not output this step)
• Face fully cartoon-stylized: smooth simplified anatomy, large expressive eyes, rounded cheeks, simplified nose/lips.
• Keep strong resemblance via key landmarks (face shape, eyebrow shape, eye spacing, nose/mouth proportions), reduce realism by 40–60% (no pores/skin texture/photoreal shading).
• Hair matches the photo's silhouette (same cut/parting/volume/color) but as clean sculpted 3D hair with a smooth glossy finish (no individual strands).
• Accessories remain faithful but simplified and toy-like.
• Body proportions toy-like: slightly oversized head (about 1:2.5 head-to-body ratio), slim torso, slightly oversized hands/shoes.
• Outfit stays the same as the original photo: preserve exact colors and major design details, simplified into clean chunky toy shapes.
• Shading: soft cel-like transitions, vinyl/resin-like finish, glossy eyes with strong catchlights, soft studio lighting with gentle rim light.
• Background: simple gradient.

STEP 2 — Convert that character into a REALISTIC crochet amigurumi doll (THIS IS THE FINAL OUTPUT)
Output ONLY the final crochet doll product photo.
NO keychain parts:
• Do NOT include any keychain hardware at all (no clasp, no jump ring, no chain, no keyring).
• This is a standalone crochet doll product photo.
Material realism (VERY IMPORTANT):
• Every visible element must look physically buildable from yarn/fiber: tight single-crochet stitch loops, visible yarn texture, stuffed plush volume, subtle seam lines.
• No plastic/resin/vinyl surfaces, no CGI look, no painted textures, no printed graphics, no decals/stickers.
• Facial features must be textile only: embroidered eyes OR felt applique eyes (matte textile), embroidered eyebrows and mouth, blush as yarn shading/pastel on yarn (still textile).
Hair & accessories (crochet-only):
• Hair becomes crochet hair shapes with visible stitch loops while keeping the same silhouette and color.
• Accessories recreated with crochet construction/embroidery only (crocheted applique, crochet sculpture, lace/mesh stitch). No hard-looking ornaments.
Outfit (crochet-friendly realism):
• Preserve the same outfit colors and overall design from the original photo.
• If the outfit includes complex motifs, simplify into realistic crochet techniques only:
  - embroidered lines (backstitch/chain stitch)
  - small crochet applique patches
  - basic color blocks (intarsia/jacquard-like)
• Suggest ornate details with simplified stitches; avoid intricate photoreal patterns.

FRAMING / NO-CROP (NON-NEGOTIABLE)
• Full-body product shot: entire crochet doll visible from head to toe, including both feet/shoes.
• No cropping, no cut-offs at top/bottom/sides. Leave safe margins around the doll.
• Keep the doll centered with the same pose and placement as the original image.

PRODUCT PHOTO LOOK
• Realistic studio product photo of a handmade crochet doll (not CGI).
• Soft studio lighting, gentle rim light, crisp focus on yarn texture, clean background.
Strictly avoid:
• photoreal human skin
• 3D render look
• glossy plastic eyes
• printed patterns/decals
• metallic foil-like embroidery
• any cropping of the doll`,
  },
  {
    id: 2,
    title: 'coming soon',
    image: null,
    description: 'Coming soon...',
    content: 'Coming soon...',
  },
  {
    id: 3,
    title: 'coming soon',
    image: null,
    description: 'Coming soon...',
    content: 'Coming soon...',
  },
  {
    id: 4,
    title: 'coming soon',
    image: null,
    description: 'Coming soon...',
    content: 'Coming soon...',
  },
];

export default function AiPromptPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/')}>
          {'<'}
        </button>
        <h1>AI Prompt</h1>
      </header>

      <main className={styles.grid}>
        {prompts.length === 0 ? (
          <p className={styles.empty}>프롬프트가 아직 없습니다.</p>
        ) : (
          prompts.map((prompt) => (
            <div key={prompt.id} className={styles.card} onClick={() => setSelected(prompt)}>
              <div className={styles.imageWrapper}>
                {prompt.image ? (
                  <Image src={prompt.image} alt={prompt.title} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.placeholder} />
                )}
              </div>
              <h3 className={styles.cardTitle}>{prompt.title}</h3>
            </div>
          ))
        )}
      </main>

      {selected && (
        <div className={styles.overlay} onClick={() => { setSelected(null); setCopied(false); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalImageWrapper}>
              {selected.image ? (
                <Image src={selected.image} alt={selected.title} fill style={{ objectFit: 'cover' }} />
              ) : (
                <div className={styles.placeholder} />
              )}
            </div>
            <h2 className={styles.modalTitle}>{selected.title}</h2>
            <p className={styles.modalDescription}>{selected.description}</p>
            <div className={styles.modalButtons}>
              <button
                className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                onClick={() => handleCopy(selected.content)}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className={styles.closeButton} onClick={() => { setSelected(null); setCopied(false); }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
