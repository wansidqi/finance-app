import { atom } from "jotai";
import { useAtomState } from ".";

export const savingDataAtom = atom([
  {
    name: "Saving 1",
    initialValue: 1000,
    currentValue: 1500,
    percentChange: 50,
  },
  {
    name: "Saving 2",
    initialValue: 2000,
    currentValue: 2300,
    percentChange: 15,
  },
  {
    name: "Saving 3",
    initialValue: 500,
    currentValue: 450,
    percentChange: -10,
  },
  {
    name: "Saving 4",
    initialValue: 3000,
    currentValue: 3600,
    percentChange: 20,
  },
  {
    name: "Saving 5",
    initialValue: 1500,
    currentValue: 1800,
    percentChange: 20,
  },
]);

export const savings = useAtomState(savingDataAtom);
