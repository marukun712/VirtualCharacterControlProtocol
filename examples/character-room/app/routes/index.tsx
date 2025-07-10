import { createRoute } from "honox/factory";
import CharacterRoom from "../islands/room";

export default createRoute((c) => {
  return c.render(<CharacterRoom />);
});
