import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** Fotos por mensagem. O peso é garantido pela conversão, não por um teste. */
export const MAX_TICKET_PHOTOS = 3;

/**
 * Largura a que a foto é reduzida antes de subir. 1600 px chega para se ver a
 * chapa de um esquentador ou a marca de água numa parede; o original de 12 MP
 * só serve para encher o pedido.
 */
const PHOTO_WIDTH = 1600;

export type TicketPhoto = { uri: string; name: string; type: string };

/**
 * Fotos para juntar a um pedido de ajuda — ao primeiro ou a uma resposta.
 *
 * As fotos são SEMPRE reduzidas e reconvertidas para JPEG antes de saírem do
 * telemóvel, e isso resolve três coisas de uma vez:
 *
 *  1. O iPhone guarda em HEIC, que nenhum browser desenha numa <img>. Sem isto
 *     a foto chegava ao backoffice como um ícone partido — a pior das falhas,
 *     porque parece que funcionou.
 *  2. Uma foto de 12 MP são ~2,8 MB. Três dessas passam o limite de corpo da
 *     função no servidor e o pedido morre antes de lá chegar.
 *  3. Reconverter deita fora o EXIF, incluindo as coordenadas de GPS da casa
 *     do cliente, que não têm nada que ir para um bucket.
 */
export const useTicketPhotos = () => {
  const [photos, setPhotos] = useState<TicketPhoto[]>([]);
  const [falhou, setFalhou] = useState(false);

  const pick = useCallback(async () => {
    setFalhou(false);
    const remaining = MAX_TICKET_PHOTOS - photos.length;
    if (remaining <= 0) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.5,
    });
    if (result.canceled) return;

    const escolhidas: TicketPhoto[] = [];
    let erro = false;

    for (const asset of result.assets) {
      try {
        const tratada = await manipulateAsync(
          asset.uri,
          [{ resize: { width: PHOTO_WIDTH } }],
          { compress: 0.6, format: SaveFormat.JPEG },
        );
        escolhidas.push({
          uri: tratada.uri,
          name: `foto_${Date.now()}_${escolhidas.length}.jpg`,
          type: "image/jpeg",
        });
      } catch {
        // A conversão falhou: em vez de mandar um original de formato
        // desconhecido, não se manda nada e diz-se. Uma foto perdida é melhor
        // do que um pedido que rebenta no envio.
        erro = true;
      }
    }

    if (escolhidas.length > 0) {
      setPhotos((prev) => [...prev, ...escolhidas].slice(0, MAX_TICKET_PHOTOS));
    }
    if (erro) setFalhou(true);
  }, [photos.length]);

  const remove = useCallback((uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }, []);

  const clear = useCallback(() => setPhotos([]), []);
  const limparErro = useCallback(() => setFalhou(false), []);

  return { photos, pick, remove, clear, falhou, limparErro };
};

/** Junta os campos e as fotos num corpo que o servidor sabe ler. */
export const corpoDoPedido = (campos: Record<string, string>, photos: TicketPhoto[]) => {
  // Sem fotos continua a ir JSON — é o corpo mais pequeno e é o que o servidor
  // já recebia. Com fotos passa a multipart, que evita o imposto de 33% do
  // base64 sobre ficheiros que já são pesados.
  if (photos.length === 0) {
    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campos),
    };
  }

  const form = new FormData();
  Object.entries(campos).forEach(([k, v]) => form.append(k, v));
  photos.forEach((photo) => {
    form.append("images", { uri: photo.uri, name: photo.name, type: photo.type } as any);
  });
  // Sem Content-Type à mão: é o fetch que o tem de pôr, com o boundary.
  return { headers: undefined, body: form };
};
