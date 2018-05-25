# RCPI-Server

RCPI is a tool that allow you to use UDP / Websockets to control an omx_player instance on a raspberry pi

There is an [Android Client](https://github.com/hacketo/RCPI-Android)

More details later on this little project.



## Protocol

### UDP Packets

The udp packets Client->Server are constructed from a string, (this will change in the future)
There is two type of packet
* ***RC*** packets<br>
    `$< CODE >`<br>
    **$** : specify that the packet is a rcpacket<br>
    **< CODE >** *number* : defined in the table bellow
* ***ACTION*** packets<br>
    `< ACTION >|< OPT_DATA >`<br>
    **< ACTION >** *string* : defined in the table bellow<br>
    **< OPT_DATA >** *string* : can provide data to the action
    
The udp packets Server->Client are JSON, (this will change in the future)
```
{
    "action": < ACTION >,
    "data":   < OPT_DATA >
}
```
**< ACTION >** *string* : defined in the table bellow<br>
**< OPT_DATA >** *JSON* : can provide data to the action
    
### Server -> Client
KEY | ACTION/CODE | OPT_DATA | Comment
--- | --- | --- | ---
LIST | list | media_list | list of available medias [@see #RELOAD](#reload)
FINFOS | finfos | player_infos | the current informations of the player [@see #PING](#ping)

### Client -> Server

KEY | ACTION/CODE | OPT_DATA | Comment
--- | --- | --- | ---
OPEN | open | uri | Url of the media
RELOAD | reload | | Get a list of available medias
PING | ping | | Get the current informations of the player
PLAY | 1 |  | 
PLAYBACK_BACKWARD600 | 4 | |
PLAYBACK_BACKWARD30 | 5 | | 
PLAYBACK_FORWARD30 | 6 | | 
PLAYBACK_FORWARD600 | 7 | | 
AUDIO_TRACK_NEXT | 8 | | 
AUDIO_TRACK_PREV | 9 | | 
AUDIO_VOL_UP | 10 | | 
AUDIO_VOL_DOWN | 11 | | 
SUBTITLE_TOGGLE | 12 | | 
SUBTITLE_TRACK_NEXT | 13 | | 
SUBTITLE_TRACK_PREV | 14 | | 
SUBTITLE_DELAY_DEC | 15 | |
SUBTITLE_DELAY_INC | 16 | |
INFOS | 17 | |
QUIT | 18 | |


#### OPEN

The **OPEN** packet will tell omx to load the file specified as OPT_DATA<br>
```
open|< MEDIA_URI >
```
**< MEDIA_URI >** *string* : uri of the media; supports : file/http protocols, youtube url<br>

#### <a name="reload"></a>RELOAD

The **RELOAD** packet will ask omx to send the list of the available medias<br>
```
reload
```

Return from the server<br>
```
{
    "action":"list",
    "data":< JSON_DATA >
}
```
**< JSON_DATA >** *JSON_ARRAY* : path list of the available medias<br>


#### <a name="ping"></a>PING

The PING packet will ask omx to send the informations about the current media playing<br>
```
ping
```

Return from the server<br>
```
{
    "action" : "finfos",
    "data" : {
      "action"  : < MEDIA_STATUS >,
      "duration": < MEDIA_DURATION >,
      "cursor"  : < MEDIA_CURSOR >
    }
}
```
**< MEDIA_STATUS >** *string* : play / stop<br>
**< MEDIA_DURATION >** *number* : duration in seconds of the playing media <br>
**< MEDIA_CURSOR >** *number* : cursor position in seconds of the playing media<br>

