/**
 * Supabase 클라이언트 설정
 *
 * TODO: 현재 이 클라이언트는 초기화만 되어 있고 사용되지 않습니다.
 * 다음 기능들을 구현할 때 사용할 예정:
 * - 사용자 인증 (로그인/회원가입)
 * - 도안 저장 및 공유
 * - 커뮤니티 기능 (다른 사용자 도안 보기)
 * - 피드백 수집
 *
 * 환경 변수 설정이 필요합니다:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

/**
 * Supabase 클라이언트 가져오기
 * 환경 변수가 설정되지 않은 경우 null 반환
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase 환경 변수가 설정되지 않았습니다. ' +
        'NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.'
    );
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  return supabase;
};

/**
 * Supabase가 사용 가능한지 확인
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseKey);
};

// 하위 호환성을 위해 기존 export 유지 (환경 변수가 있는 경우에만)
export { supabase };
