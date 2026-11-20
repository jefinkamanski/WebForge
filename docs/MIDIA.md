# Guia de mídia

O servidor **não transcodifica vídeo** (a VPS é dividida entre vários sites). Otimize os arquivos antes de enviar pelo painel. O envio é feito no campo de mídia da própria seção; a página **Mídia** reúne todos os arquivos já enviados.

Toda mídia pede um **texto alternativo**: descreva o que aparece (ex.: "Equipe reunida no escritório"). Ele é lido por leitores de tela e pelo Google, e pode ser editado depois na página Mídia.

Uma mídia em uso (numa seção ou num post, inclusive na lixeira) não pode ser excluída: o painel avisa onde ela está. Troque-a ou remova-a antes.

No texto dos posts, as imagens também vêm da biblioteca (botão **Imagem** do editor). Imagens coladas de outros sites são descartadas ao salvar.

## Imagens (limite: 8 MB)

Envie JPG, PNG ou WebP em boa qualidade. A API gera uma WebP de até 1920 px, sem metadados (EXIF/GPS), e o site entrega os tamanhos certos para cada tela.

## Vídeo do hero (limite: 25 MB)

Curto (5 a 15 s), sem áudio, 1280 px de largura, em **MP4 (H.264)**. Exemplo com ffmpeg, na sua máquina:

```bash
ffmpeg -i entrada.mov -an -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart saida.mp4
```

O HandBrake (interface gráfica) também serve. Envie sempre um **poster** (imagem do primeiro quadro) junto com o vídeo: ele aparece enquanto o vídeo carrega e para quem prefere menos movimento.

## Vídeo longo

Para vídeos institucionais longos, prefira publicar no YouTube ou Vimeo e usar o link.
