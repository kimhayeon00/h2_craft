'use client';

import Link from "next/link";
import styles from './page.module.css'
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
            <h1>h2_craft</h1>
        </div>
      </header>
      
      <main className={styles.main}>
        <section className={styles.features}>
          <div 
            className={styles.featureCard}
            onClick={() => router.push('/pattern')}
          >
            <h3>Make Your Own Pattern</h3>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
      <div className={styles.socialLinks}>
          <Link 
            href="https://www.youtube.com/@h2craft3000" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.socialLink}
          >
            유튜브 바로가기
          </Link>
          <Link 
            href="https://www.instagram.com/h2_craft" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.socialLink}
          >
            인스타 바로가기
          </Link>
        </div>
        <p>&copy; 2025 h2_craft. All rights reserved.</p>
      </footer>
    </div>
  );
}
