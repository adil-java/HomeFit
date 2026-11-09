import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setScreenCache } from '@/store/slices/screenCacheSlice';

/**
 * Read/write the cached API response for a screen.
 *
 * Pass `null` as the key while the user isn't known yet; nothing is read or
 * written in that case.
 *
 *   const [cached, saveCache] = useScreenCache<MyData>(user ? `orders:${user.uid}` : null);
 */
export function useScreenCache<T>(key: string | null): [T | undefined, (data: T) => void] {
  const dispatch = useAppDispatch();
  const cached = useAppSelector((state) =>
    key ? (state.screenCache[key]?.data as T | undefined) : undefined
  );

  const save = useCallback(
    (data: T) => {
      if (key) dispatch(setScreenCache({ key, data }));
    },
    [dispatch, key]
  );

  return [cached, save];
}
