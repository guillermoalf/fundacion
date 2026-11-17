import Vacio from "./Vacio";

export default function SinPermiso({ que = "esta sección", quien = "la dirección" }: { que?: string; quien?: string }) {
  return (
    <Vacio titulo="No tiene acceso a esta sección.">
      Solo {quien} puede usar {que}. Si lo necesita, pídale acceso a la dirección.
    </Vacio>
  );
}
