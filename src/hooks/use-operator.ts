import { useEffect, useState } from 'react';
import { OPERATORS, DEFAULT_OPERATOR } from '@/lib/constants';
import type { Operator } from '@/lib/types';

const KEY = 'aios.operator';

function read(): Operator {
  if (typeof window === 'undefined') return DEFAULT_OPERATOR;
  const v = window.localStorage.getItem(KEY);
  return v && OPERATORS.includes(v) ? v : DEFAULT_OPERATOR;
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
