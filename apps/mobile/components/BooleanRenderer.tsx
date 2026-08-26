type BooleanRendererProps = {
  condition: boolean;
  editOn: React.ReactNode;
  editOff: React.ReactNode;
};

export const BooleanRenderer: React.FC<BooleanRendererProps> = ({
  condition,
  editOn,
  editOff,
}) => {
  return <>{condition ? editOn : editOff}</>;
};
