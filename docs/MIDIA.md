# Guia de mídia

O servidor **não transcodifica vídeo** (hospedagem compartilhada). Otimize os arquivos antes de subir pelo painel.

## Imagens
Envie JPG/PNG em boa qualidade. A API converte para **WebP** e gera tamanhos responsivos. O texto alternativo (`alt`) é obrigatório.

## Vídeo do hero (limite padrão: 25 MB)
Duração curta (5 a 15 s), sem áudio, 1280 px de largura, em dois formatos. Exemplos com ffmpeg, na sua máquina:

```bash
# MP4 (H.264), compatível com todos os navegadores
ffmpeg -i entrada.mov -an -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow -movflags +faststart saida.mp4

# WebM (VP9), menor para navegadores modernos
ffmpeg -i entrada.mov -an -vf "scale=1280:-2" -c:v libvpx-vp9 -crf 34 -b:v 0 saida.webm
```

Também é possível usar o HandBrake (interface gráfica). Envie sempre um **poster** (imagem do primeiro quadro) junto com o vídeo.

## Alternativa
Aceite um link do YouTube/Vimeo se o vídeo for longo.
