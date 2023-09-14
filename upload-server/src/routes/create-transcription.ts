import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { createReadStream } from 'node:fs'
import { openai } from "../lib/openai";


export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (req) => {
    const paramsSchema = z.object({
      videoId: z.string().uuid(),
    });

    const { videoId } = paramsSchema.parse(req.params);

    const bodySchema = z.object({
      prompt: z.string(),
    });

    const { prompt } = bodySchema.parse(req.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      }
    })

    const videoPath = video.path //Caminho onde arquivo foi salvo
    const audioReadStream = createReadStream(videoPath)

    //Transcrição de audio openai
    const response = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'json',
      temperature: 0,
      prompt,
    })

    //Update no banco com a transcrição
    const transcription = response.text
    await prisma.video.update({
      where:{
        id: videoId,
      },
      data:{
        transcription,
      },
    })
    return {transcription}
  })
}
