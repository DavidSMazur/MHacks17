import type { StartAvatarResponse, StartAvatarRequest } from "@heygen/streaming-avatar";
import StreamingAvatar, {AvatarQuality, StreamingEvents} from "@heygen/streaming-avatar";

import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";

export default function AvatarComponent(){

    const avatar = useRef<StreamingAvatar | null>(null);
    const [stream, setStream] = useState<MediaStream>();

    const avatarId = "37f4d912aa564663a1cf8d63acd0e1ab";

    const mediaStream = useRef<HTMLVideoElement>(null);

    async function fetchAccessToken() {
        try {
        const response = await fetch("/api/get-access-token", {
            method: "POST",
        });
        const token = await response.text();

        console.log("Access Token:", token); // Log the token to verify

        return token;
        } catch (error) {
        console.error("Error fetching access token:", error);
        }

        return "";
    }

    async function startSession() {
        const newToken = await fetchAccessToken();
    
        avatar.current = new StreamingAvatar({
          token: newToken,
        });

        try {
            const res = await avatar.current.createStartAvatar({
              quality: AvatarQuality.Low,
              avatarName: avatarId,
            //   knowledgeId: knowledgeId, // Or use a custom `knowledgeBase`.
            //   voice: {
            //     rate: 1.5, // 0.5 ~ 1.5
            //     emotion: VoiceEmotion.EXCITED,
            //   },
            //   language: language,
            });
      
          } catch (error) {
            console.error("Error starting avatar session:", error);
          }

          avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
            console.log(">>>>> Stream ready:", event.detail);
            setStream(event.detail);
          });

    }

        useEffect(() => {
            if (stream && mediaStream.current) {
            mediaStream.current.srcObject = stream;
            mediaStream.current.onloadedmetadata = () => {
                mediaStream.current!.play();
                // setDebug("Playing");
            };
            }
        }, [mediaStream, stream]);

        return (
        <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
        </div>
        )

    }