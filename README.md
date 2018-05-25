# RCPI-Server

RCPI is a tool that allow you to use UDP / Websockets to control an omx_player instance on a raspberry pi

There is an [Android Client](https://github.com/hacketo/RCPI-Android)

More details later on this little project.

## Dependencies

This project require [*ffmpeg/ffprobe*](https://git.ffmpeg.org/ffmpeg.git) to be installed on the raspberry pi.


## Getting Started

```
npm install

npm start
```


## Protocol

### UDP Packets

The udp packets are constructed with messagepack

* From Server 
```
[6, < CODE >, < OPT_DATA > ]
```

* From Client
```
[4, < CODE >, < OPT_DATA > ]
```

**< CODE >** *number* : defined in the table bellow<br>
**< OPT_DATA >** *Any=* : can provide data to the action


---


KEY | CODE | OPT_DATA | Comment
--- | --- | --- | ---
PING | 0 | | ask current informations about the player
OPEN | 1 | uri | Url of the media
PLAY | 2 | | 
LIST | 3 | media_list | list of available medias [@see #LIST](#list)
FINFOS | 4 | player_infos | the current informations of the player [@see #PING](#ping)
PLAYBACK_BACKWARD600 | 5 | |
PLAYBACK_BACKWARD30 | 6 | | 
PLAYBACK_FORWARD30 | 7 | | 
PLAYBACK_FORWARD600 | 8 | | 
AUDIO_TRACK_NEXT | 9 | | 
AUDIO_TRACK_PREV | 10 | | 
AUDIO_VOL_UP | 11 | | 
AUDIO_VOL_DOWN | 12 | | 
SUBTITLE_TOGGLE | 13 | | 
SUBTITLE_TRACK_NEXT | 14 | | 
SUBTITLE_TRACK_PREV | 15 | | 
SUBTITLE_DELAY_DEC | 16 | |
SUBTITLE_DELAY_INC | 17 | |
INFOS | 18 | |
QUIT | 19 | |


---


### OPEN


The ***OPEN*** packet will tell RCPI to load the file specified as MEDIA_URI<br>
```
[4, 1, < MEDIA_URI >]
```
**< MEDIA_URI >** *string* : uri of the media; supports : file/http protocols, youtube url<br>

### <a name="list"></a>LIST

The ***LIST*** packet will ask RCPI to send the list of the available medias<br>
```
[4, 3]
```

Return ***LIST*** from the server<br>
```
[6, 3, < MEDIA_LIST >]
```
**< MEDIA_LIST >** *Array\<String>* : path list of the available medias<br>


### <a name="ping"></a>PING

The ***PING*** packet will ask RCPI to send the informations about the current media playing<br>
```
[4, 0]
```

Return ***FINFOS*** from the server<br>
```
[6, 4, [< MEDIA_CURSOR >, < MEDIA_STATUS >, < MEDIA_DURATION >]]
```
**< MEDIA_CURSOR >** *number* : cursor position in seconds of the playing media<br>
**< MEDIA_STATUS >** *boolean* : is the media currently playing<br>
**< MEDIA_DURATION >** *number* : duration in seconds of the playing media <br>

