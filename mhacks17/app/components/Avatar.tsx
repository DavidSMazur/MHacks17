"use client"
import { AvatarCreator, AvatarCreatorConfig, AvatarExportedEvent } from '@readyplayerme/react-avatar-creator';
import { Avatar } from "@readyplayerme/visage";
import { useState } from "react";

const config: AvatarCreatorConfig = {
  clearCache: true,
  bodyType: 'fullbody',
  quickStart: false,
  language: 'en',
};

const style = { width: '100%', height: '100vh', border: 'none' };

const AvatarComp = () => {
    // const [avatarUrl, setAvatarUrl] = useState('');
    // const handleOnAvatarExported = (event: AvatarExportedEvent) => {
    //     setAvatarUrl(event.data.url);
    // };
    const avatarUrl = "https://models.readyplayer.me/66f86083f9874a9a33ed019f.glb"
    return (  
        <>
          {/* <AvatarCreator subdomain="demo" config={config} style={style} onAvatarExported={handleOnAvatarExported} /> */}
          {avatarUrl && <Avatar modelSrc={avatarUrl} />}
        </>
    );
}

export default AvatarComp;