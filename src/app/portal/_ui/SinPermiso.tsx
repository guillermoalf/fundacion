import Vacio from "./Vacio";

export default function SinPermiso({ que = "esta sección" }: { que?: string }) {
  return (
    <Vacio titulo="No tiene acceso a esta sección.">
      Solo la dirección puede usar {que}. Si lo necesita, pídale acceso a la dirección.
    </Vacio>
  );
}
