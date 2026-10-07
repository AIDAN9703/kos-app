import { useMutation } from "@tanstack/react-query";
import { deleteBoat } from "../boat.actions";

export function useDeleteBoat() {
  return useMutation({
    mutationFn: deleteBoat,
  });
}
