import { useEffect, useState } from 'react';
import type { Operator } from '@/lib/types';

const KEY = 'aios.operator';
const DEFAULT_OPERATOR: Operator = 'Murilo';

function read(): Operator {
  if (typeof window === 'undefined') return DEFAULT_OPERATOR;
  const v = window.localStorage.getItem(KEY);
  return v === 'Lucas' || v === 'Murilo' ? v : DEFAULT_OPERATOR;
}

export function useOperator() {
  const [operator, setOperator] = useState<Operator>(read);

  useEffect(() => {
    window.localStorage.setItem(KEY, operator);
  }, [operator]);

  return { operator, setOperator };
}

export function getOperatorOnce(): Operator {
  return read();
}
