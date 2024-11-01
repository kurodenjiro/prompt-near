import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const useCreateQueryString = () => {
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value?: string | number | null) => {
      const params = new URLSearchParams(searchParams);

      if (!value) {
        params.delete(name);
      } else {
        params.set(name, value.toString());
      }

      return params.toString();
    },
    [searchParams]
  );

  return createQueryString;
};

export default useCreateQueryString;
