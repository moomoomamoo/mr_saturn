import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import * as firebase from 'firebase/app';

interface TwitchCommand {
    msg: string;
    milkMan: boolean;
}

// export interface Saturn {
//     moving: boolean;
//     x: number;
//     y: number;
// }

const GRAVITY = 0.1;

export class Saturn {
    moving: boolean;
    x: number;
    y: number;
    xx: number;
    yy: number;

    destroyed: boolean;

    constructor(public maxWidth: number, public maxHeight: number, public onDestroy?: (saturn?: Saturn)=>any) {
        this.moving = false;
        this.x = 0;
        this.y = -20;
    }

    init() {
        this.moving = false;
        this.destroyed = false;

        this.x = 0;
        this.y = -20;

        this.xx = 0;
        this.yy = 0;
    }

    setPlan() {
        const width = (this.maxWidth * 3 + this.maxWidth * 7 * Math.random()) / 10;
        const height = (this.maxHeight * 5 + this.maxHeight * 5 * Math.random()) / 10;

        // Min test
        // const width = this.maxWidth * 3 / 10;
        // const height = this.maxHeight * 5 / 10;

        // Max test
        // const width = this.maxWidth;
        // const height = this.maxHeight;

        const t = 120;

        this.yy = height / t - (-GRAVITY * t / 2);

        this.xx = width / t / 2 || 2;
    }

    startMoving() {
        this.moving = true;
        this.move();
    }

    move() {
        if (!this.moving) {
            return;
        }

        if (this.y <= -60) {
            this.destroy();
            return;
        }

        this.y += this.yy;
        this.x += this.xx;

        this.yy -= GRAVITY;

        if (this.y > this.maxHeight) {
            this.y = this.maxHeight;
            if (this.yy > 0) {
                // this.yy = 0;
            }
        }

        if (this.x > this.maxWidth) {
            this.x = this.maxWidth;
            if (this.xx > 0) {
                this.xx = -this.xx;
            }
        }

        setTimeout(() => {
            this.move();
        }, 1);
    }

    destroy() {
        this.destroyed = true;
        this.moving = false;

        if (this.onDestroy) {
            this.onDestroy(this);
        }
    }
}

export interface Msg {
    text: string;
    x: number;
    y: number;
    destroyed: boolean;
    font: string;
}

export interface Settings {
    font: 'random' | 'normal' | 'boing' | 'lumine hall';
    allowMsgsFromChat: boolean;
    volume: number;
    playSounds: boolean;
    limitSounds: boolean;
    motivationMinutes: number;
    motivateAt: number;
    motivateFinishedAt: number;
    loopCount: number;
}

@Component({
    selector: 'rr-video-overlay',
    templateUrl: './video_overlay.template.html',
    styleUrls: ['./video_overlay.style.scss']
})
export class VideoOverlayComponent {
    player1: HTMLAudioElement;
    player2: HTMLAudioElement;
    player3: HTMLAudioElement;

    @ViewChild('mr_saturn_sfx_1') set playerRef1(ref: ElementRef<HTMLAudioElement>) {
        if (ref && ref.nativeElement) {
            this.player1 = ref.nativeElement;
        }
    }
    @ViewChild('mr_saturn_sfx_2') set playerRef2(ref: ElementRef<HTMLAudioElement>) {
        if (ref && ref.nativeElement) {
            this.player2 = ref.nativeElement;
        }
    }
    @ViewChild('mr_saturn_sfx_') set playerRef3(ref: ElementRef<HTMLAudioElement>) {
        if (ref && ref.nativeElement) {
            this.player3 = ref.nativeElement;
        }
    }

    lastSoundSeed: number = 0;

    lastPlayedSoundAt: number;

    settings: Settings;

    box: HTMLDivElement;

    @ViewChild('the_box') set boxRef(ref: ElementRef<HTMLDivElement>) {
        this.box = ref.nativeElement;
    }

    saturns: Saturn[];
    loopSaturns: Saturn[];
    msgs: Msg[];

    milkManTimeout: any;//NodeJS.Timer;

    activeMilkMan: boolean = false;

    dark: boolean;

    constructor() {
    }

    ngOnInit() {
        try {
            if (localStorage.getItem('dark')) {
                this.dark = true;
            }
        }catch(error) {
            console.error(error);
        }
        

        this.saturns = [];
        this.msgs = [];

        this.createSaturn('BOING!');
        this.createSaturn('BOING!');
        this.createSaturn('BOING!');

        this.settings = {
            font: 'normal',
            allowMsgsFromChat: false,
            volume: 0,
            playSounds: false,
            limitSounds: true,
            motivationMinutes: 0,
            motivateAt: null,
            motivateFinishedAt: null,
            loopCount: 0
        }

        firebase.firestore().collection("saturns").doc('settings').onSnapshot(docSnapshot => {
            const doc = docSnapshot.data() as Settings;

            if (doc) {
                this.settings = {
                    font: doc.font || 'normal',
                    allowMsgsFromChat: doc.allowMsgsFromChat || false,
                    volume: doc.volume || 0,
                    playSounds: doc.playSounds || false,
                    limitSounds: doc.limitSounds || false,
                    motivationMinutes: doc.motivationMinutes || 0,
                    motivateAt: doc.motivateAt || 0,
                    motivateFinishedAt: doc.motivateFinishedAt || 0,
                    loopCount: doc.loopCount || 0
                }

                if (doc.loopCount) {
                    if (this.saturns.length < doc.loopCount) {
                        this.createSaturns(doc.loopCount - this.saturns.length);
                    }
                }
            }
        });

        let skip = true;

        firebase.firestore().collection("saturns").doc('chat').onSnapshot(docSnapshot => {
            if (skip) {
                skip = false;
                return;
            }

            const doc = docSnapshot.data() as TwitchCommand;

            console.log("Current data: ", docSnapshot.data());

            if (doc.milkMan) {
                this.activateMilkMan();
            }

            let msg = '';

            if (doc.msg) {
                for (let i = 0; i < Math.floor((doc.msg.length / 20)); i++) {
                    this.createSaturn();
                }

                if (!doc.milkMan && this.settings.allowMsgsFromChat && doc.msg.length < 40) {
                    msg = doc.msg;
                }
            }

            const now = Date.now();

            if (this.settings.motivationMinutes) {
                const motivateAt = this.settings.motivateAt || 0;

                if (now > motivateAt + 1000 * 20) {
                    console.log("too late for motivateAt", now - motivateAt);
                } else {
                    console.log();
                    if (now > motivateAt) {
                        console.log("DOING MOTIVATIONS");
                        // Add extra Mr. Saturns
                        this.createSaturn();
                        this.createSaturn();

                        if (!msg) {
                            const randomMsgs = [
                                'Go Samtron5000',
                                'Go Samtron',
                                'You can do it',
                                'Believe!',
                                'We are... us',
                                'Motivation!',
                                'woo',
                                'yay',
                            ];

                            msg = randomMsgs[Math.floor(randomMsgs.length * Math.random())];

                            const seed = Math.floor(4 * Math.random());

                            if (seed === 0) {
                                msg = msg.toUpperCase();
                            }
                        }
                    } else {
                        console.log("Before motivating", now - motivateAt);
                    }
                }
            }

            this.createSaturn(msg);
        });
    }

    checkMotivationAt() {
        // TODO:
    }

    activateMilkMan() {
        clearTimeout(this.milkManTimeout);
        
        this.activeMilkMan = true;

        this.milkManTimeout = setTimeout(() => {
            this.activeMilkMan = false;
        }, 2000);
    }

    playSound() {
        if (!this.settings.playSounds) {
            return;
        }

        if (this.settings.limitSounds) {
            if (this.lastPlayedSoundAt && (this.lastPlayedSoundAt > Date.now() - (1000 + 100 * this.msgs.length))) {
                return;
            }
        }

        let seed = Math.floor(3 * Math.random());

        if (seed === this.lastSoundSeed) {
            seed += 1;
            if (seed >= 3) {
                seed = 0;
            }
        }

        let player: HTMLAudioElement = null;

        if (seed === 0) {
            player = this.player1;
        } else if (seed === 1) {
            player = this.player2;
        } else if (seed === 2) {
            player = this.player3;
        }

        this.lastSoundSeed = seed;
        this.lastPlayedSoundAt = Date.now();

        if (player) {
            player.volume = this.settings.volume;

            return player.play().catch(error => {
                console.error(error);
            });
        }
    }

    removeSaturn(removeSaturn: Saturn) {
        for (let i = 0; i <this.saturns.length; i++) {
            const saturn = this.saturns[i];

            if (saturn === removeSaturn) {
                this.saturns.splice(i, 1);
                break;
            }
        }
    }

    createSaturns(count: number) {
        for (let i = 0; i < count; i++) {
            this.createSaturn();
        }
    }

    createSaturn(msgText?: string) {
        console.log(msgText);
        
        const maxHeight = (this.box && this.box && this.box.offsetHeight || 100) - 40;// 40 pixels for the size of the sprite
        const maxWidth = this.box && this.box && this.box.offsetWidth || 100;

        const onDestroy = (saturn: Saturn) => {
            this.removeSaturn(saturn);

            if (this.saturns.length < this.settings.loopCount) {
                this.createSaturns(this.settings.loopCount - this.saturns.length);
            }
        };

        const saturn: Saturn = new Saturn(maxWidth, maxHeight, onDestroy);
        
        this.saturns.push(saturn);

        saturn.setPlan();
        saturn.startMoving();

        if (!msgText) {
            const seed = Math.floor(10 * Math.random());

            if (seed === 0) {
                msgText = 'BOING!';
            }
        }

        if (msgText) {
            setTimeout(() => {
                this.createMsg(saturn, msgText);
            }, 500 + Math.floor(200 * Math.random()));
        }
    }

    createMsg(saturn: Saturn, msgText: string) {
        this.playSound();

        this.msgs.push({
            text: msgText,
            destroyed: false,
            x: saturn.x,
            y: saturn.y,
            font: this.settings.font
        });
    }
    
    removeMsg(removeMsg: Msg) {
        for (let i = 0; i <this.msgs.length; i++) {
            const msg = this.msgs[i];

            if (msg === removeMsg) {
                this.msgs.splice(i, 1);
                break;
            }
        }
    }
}
