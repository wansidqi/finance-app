import { PrimitiveAtom, useAtom } from "jotai";

export function useAtomState<Value>(atom: PrimitiveAtom<Value>) {
  const [get, set] = useAtom(atom);
  return { get, set };
}
