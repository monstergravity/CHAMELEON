/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameMode, PaintingData, LevelDifficulty } from '../types';
import { GameCanvas } from './GameCanvas';
import { ProceduralArtThumbnail } from './ProceduralArtThumbnail';
import { audio } from './AudioEngine';
import { Play, RotateCcw, Volume2, VolumeX, HelpCircle, Award, Trophy, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, BookOpen, Lock } from 'lucide-react';

type GameState = 'welcome' | 'playing' | 'cleared' | 'failed' | 'victory';

interface GalleryStats {
  levelsCleared: number;
  timesSpotted: number;
  secondsPlayed: number;
}

interface GallerySave {
  version: 1;
  levelIndex: number;
  gameState: GameState;
  stats: GalleryStats;
  lang: 'zh' | 'en';
  isMuted: boolean;
  unlockedLevelCount: number;
  updatedAt: string;
}

const SAVE_KEY = 'chameleon-save-v1';
const DEFAULT_STATS: GalleryStats = {
  levelsCleared: 0,
  timesSpotted: 0,
  secondsPlayed: 0,
};

const isGameState = (value: unknown): value is GameState => (
  value === 'welcome' ||
  value === 'playing' ||
  value === 'cleared' ||
  value === 'failed' ||
  value === 'victory'
);

const readSavedGame = (): GallerySave | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GallerySave>;
    if (parsed.version !== 1 || !isGameState(parsed.gameState)) return null;

    const levelIndex = Number.isInteger(parsed.levelIndex) ? parsed.levelIndex! : 0;
    const stats = parsed.stats || DEFAULT_STATS;
    const levelsCleared = Number.isFinite(stats.levelsCleared) ? stats.levelsCleared : 0;
    const unlockedLevelCount = Number.isInteger(parsed.unlockedLevelCount)
      ? parsed.unlockedLevelCount!
      : levelsCleared + 1;

    return {
      version: 1,
      levelIndex,
      gameState: parsed.gameState,
      stats: {
        levelsCleared,
        timesSpotted: Number.isFinite(stats.timesSpotted) ? stats.timesSpotted : 0,
        secondsPlayed: Number.isFinite(stats.secondsPlayed) ? stats.secondsPlayed : 0,
      },
      lang: parsed.lang === 'zh' ? 'zh' : 'en',
      isMuted: parsed.isMuted === true,
      unlockedLevelCount,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
};

const PAINTINGS_GALLERY: PaintingData[] = [
  {
    id: 'monalisa',
    name: '蒙娜丽莎 (Mona Lisa)',
    nameEn: 'Mona Lisa',
    artist: '莱奥纳多·达·芬奇',
    artistEn: 'Leonardo da Vinci',
    year: '1503',
    description: '列奥纳多·达·芬奇的传世名作，以其神秘的微笑闻名于世。背景融合了渐变的山脉和幽静的深色自然景致。这里的色调相对单一，由古朴的深绿、土棕与淡雅的脸部肉色组成，是练习变色隐藏的完美关卡！',
    descriptionEn: 'The iconic masterpiece by Leonardo da Vinci, world-famous for her enigmatic smile. The dark scenery blends earthy browns and deep greens, making it the perfect training ground to master your camouflage skills!',
    url: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=800&auto=format&fit=crop',
    difficulty: '简单',
    backgroundColor: 'bg-emerald-950/40',
    guardCount: 2,
    guardSpeed: 0.9,
    visionRange: 160,
    proceduralType: 'monalisa',
    palette: [
      { name: '暗影黑 (Black)', nameEn: 'Shadow Black', hex: '#161311' },
      { name: '深橄榄绿 (Olive)', nameEn: 'Deep Olive', hex: '#323821' },
      { name: '黄昏古褐 (Ochre)', nameEn: 'Dusk Ochre', hex: '#8f6e3c' },
      { name: '晕涂泥棕 (Brown)', nameEn: 'Sfumato Brown', hex: '#5a4729' },
      { name: '柔和肤色 (Flesh)', nameEn: 'Soft Skin Tone', hex: '#dfba9d' },
    ],
  },
  {
    id: 'starrynight',
    name: '星空 (The Starry Night)',
    nameEn: 'The Starry Night',
    artist: '文森特·梵高',
    artistEn: 'Vincent van Gogh',
    year: '1889',
    description: '文森特·梵高在法国圣雷米精神病院期间创作的后印象主义巅峰之作。汹涌盘旋的蓝色星云、明黄璀璨的星光以及左侧高耸突兀的黑色柏树。这里的冷暖色彩碰撞极度强烈，在金黄色与幽蓝之间快速移动与换色，极具挑战！',
    descriptionEn: 'Van Gogh\'s post-impressionist masterpiece painted in Saint-Rémy. Swirling blue nebulas collide with radiant yellow stars. The stark contrast between warm stars and dark cypress requires rapid, precise color matching!',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop',
    difficulty: '中等',
    backgroundColor: 'bg-blue-950/40',
    guardCount: 3,
    guardSpeed: 1.1,
    visionRange: 160,
    proceduralType: 'starrynight',
    palette: [
      { name: '幽深星夜 (Navy)', nameEn: 'Deep Navy Sky', hex: '#10214a' },
      { name: '新月金黄 (Gold)', nameEn: 'Crescent Yellow', hex: '#fada43' },
      { name: '丝缕淡蓝 (Sky Blue)', nameEn: 'Swirling Azure', hex: '#5e8bc4' },
      { name: '丝柏墨绿 (Cypress)', nameEn: 'Cypress Dark Green', hex: '#152219' },
      { name: '星辉橙光 (Orange)', nameEn: 'Starlight Orange', hex: '#e39d24' },
    ],
  },
  {
    id: 'pearlearring',
    name: '戴珍珠耳环的少女',
    nameEn: 'Girl with a Pearl Earring',
    artist: '约翰内斯·维米尔',
    artistEn: 'Johannes Vermeer',
    year: '1665',
    description: '荷兰黄金时代大师维米尔的杰作。被称为“北方的蒙娜丽莎”。画作以纯黑无光的虚无背景为底，突显出少女身上耀眼的皇家蓝和柠檬黄头巾，以及耳畔闪烁的巨大珍珠。在此关中，黑夜与彩巾之间存在分明的色彩界限，稍不留神就会暴露在纯黑幕中。',
    descriptionEn: 'Often referred to as the "Mona Lisa of the North", this Dutch Golden Age masterwork shines against an absolute black background. The stark contrast of royal blue, lemon yellow, and the glowing pearl creates tricky visual boundaries.',
    url: 'https://images.unsplash.com/photo-1584727638096-042c45049ebe?q=80&w=800&auto=format&fit=crop',
    difficulty: '中等',
    backgroundColor: 'bg-slate-900/40',
    guardCount: 3,
    guardSpeed: 1.2,
    visionRange: 175,
    proceduralType: 'pearlearring',
    palette: [
      { name: '虚空深黑 (Pitch Black)', nameEn: 'Abyssal Black', hex: '#0c0c0e' },
      { name: '皇家青金蓝 (Blue)', nameEn: 'Ultramarine Blue', hex: '#1b3f8f' },
      { name: '柠檬嫩黄 (Yellow)', nameEn: 'Lemon Yellow', hex: '#ebd23a' },
      { name: '珍珠冷银 (Silver Pearl)', nameEn: 'Luminous Pearl', hex: '#f3f2ee' },
      { name: '柔曼肤粉 (Flesh Pink)', nameEn: 'Delicate Flesh Tone', hex: '#ecd8ca' },
    ],
  },
  {
    id: 'scream',
    name: '呐喊 (The Scream)',
    nameEn: 'The Scream',
    artist: '爱德华·蒙克',
    artistEn: 'Edvard Munch',
    year: '1893',
    description: '爱德华·蒙克的表现主义里程碑，展现了人类终极的焦虑与孤独。天空中布满了燃烧般扭曲的血红色与橙黄色波浪，峡湾湖水呈粘稠暗淡的蓝黑色。巡逻人员敏锐地沿着对角线木桥行走，强烈的红蓝对比需要你在炙热的天空与冰冷的湖水间敏捷变色。',
    descriptionEn: 'Munch\'s expressionist symbol of ultimate existential dread. Swirling bloody red and orange waves roll over a thick blue-black fjord. Guards patrol along the wooden bridge, forcing you to shift colors dynamically between sky and water.',
    url: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=800&auto=format&fit=crop',
    difficulty: '困难',
    backgroundColor: 'bg-orange-950/40',
    guardCount: 4,
    guardSpeed: 1.25,
    visionRange: 170,
    proceduralType: 'scream',
    palette: [
      { name: '血色熔岩 (Red)', nameEn: 'Sanguine Red', hex: '#d94a21' },
      { name: '焦虑郁紫 (Dark Violet)', nameEn: 'Existential Violet', hex: '#1f2244' },
      { name: '窒息麦黄 (Ochre)', nameEn: 'Melancholy Ochre', hex: '#c89f53' },
      { name: '深渊幽影 (Midnight)', nameEn: 'Abyssal Deep', hex: '#10111a' },
      { name: '惨白枯骨 (Pale Bone)', nameEn: 'Pale Bone White', hex: '#eae6d1' },
    ],
  },
  {
    id: 'greatwave',
    name: '神奈川冲浪里',
    nameEn: 'The Great Wave off Kanagawa',
    artist: '葛饰北斋',
    artistEn: 'Katsushika Hokusai',
    year: '1831',
    description: '葛饰北斋最具代表性的浮世绘版画。汹涌翻滚的大浪犹如巨爪般伸向空中的渔船，远景中富士山静穆安详。画中极其复杂的白色浪花与深沉的普鲁士蓝水面纵横交错，稍有偏差即被发现，堪称最高难度的隐藏大考！',
    descriptionEn: 'The iconic Japanese ukiyo-e woodblock print. Huge claw-like crests of waves stretch out to engulf tiny boats, framing Mt. Fuji. The dense interlacing of Prussian blue waters and stark white foam poses an supreme stealth challenge.',
    url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=800&auto=format&fit=crop',
    difficulty: '大师',
    backgroundColor: 'bg-zinc-950/40',
    guardCount: 5,
    guardSpeed: 1.4,
    visionRange: 180,
    proceduralType: 'greatwave',
    palette: [
      { name: '北斋深蓝 (Navy Wave)', nameEn: 'Hokusai Deep Blue', hex: '#0f2d59' },
      { name: '晴空土砂 (Sand Sky)', nameEn: 'Sandy Dune Sky', hex: '#ded6c3' },
      { name: '翻白巨浪 (Foam White)', nameEn: 'Spuming Foam White', hex: '#f9f8f4' },
      { name: '渊海碧青 (Teal)', nameEn: 'Dark Abyssal Teal', hex: '#1b4e6b' },
      { name: '富士暮雪 (Fuji Grey)', nameEn: 'Fuji Dusk Grey', hex: '#6d7682' },
    ],
  },
  {
    id: 'sunflowers',
    name: '向日葵 (Sunflowers)',
    nameEn: 'Sunflowers',
    artist: '文森特·梵高',
    artistEn: 'Vincent van Gogh',
    year: '1888',
    description: '文森特·梵高的传世杰作，饱含阳光般炽热的生命张力。画面充满了金黄色、琥珀橘与橄榄绿的花盘与背景。在这一关中，浓烈温暖的黄色调将深度包围你的感知，你需要保持敏捷身手并找准相近色块！',
    descriptionEn: 'Van Gogh\'s iconic yellow sunflowers radiate with intense vital energy. The canvas is filled with vibrant golds, amber oranges, and olive greens. Under extreme guard surveillance, blend neatly into these warm colors!',
    url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=800&auto=format&fit=crop',
    difficulty: '大师',
    backgroundColor: 'bg-yellow-950/40',
    guardCount: 5,
    guardSpeed: 1.5,
    visionRange: 195,
    restorationTargetPercent: 98,
    duelEnabled: true,
    proceduralType: 'sunflowers',
    palette: [
      { name: '花芯棕褐 (Ochre Brown)', nameEn: 'Ochre Seed Center', hex: '#795548' },
      { name: '向日葵金 (Sunflower Gold)', nameEn: 'Sunflower Pure Gold', hex: '#fbc02d' },
      { name: '炽热亮橙 (Vibrant Orange)', nameEn: 'Blazing Orange Petal', hex: '#ff9800' },
      { name: '背景嫩黄 (Cream Yellow)', nameEn: 'Warm Cream background', hex: '#fff59d' },
      { name: '花茎嫩绿 (Stem Green)', nameEn: 'Vibrant Green Stem', hex: '#4caf50' },
    ],
  },
  {
    id: 'waterlilies',
    name: '睡莲 (Water Lilies)',
    nameEn: 'Water Lilies',
    artist: '克劳德·莫奈',
    artistEn: 'Claude Monet',
    year: '1916',
    description: '印象派巨匠克劳德·莫奈的终极神作。平静水面交织着斑斓的深紫、翠绿和淡粉睡莲。本关为全馆终极“噩梦”难度，将有6名超高警惕、极速移动巡逻的保安形成密不可分的手电探照天网！',
    descriptionEn: 'Claude Monet\'s late-career masterpiece capturing light on still waters. Shimmering indigos, deep mosses, and soft waterlily pinks intertwine. The ultimate nightmare tier features 6 high-vigilance rapid-patrol guards.',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    difficulty: '噩梦',
    backgroundColor: 'bg-indigo-950/40',
    guardCount: 6,
    guardSpeed: 1.6,
    visionRange: 200,
    proceduralType: 'waterlilies',
    palette: [
      { name: '幽水深蓝 (Pond Indigo)', nameEn: 'Luminous Pond Indigo', hex: '#1a237e' },
      { name: '浮萍翠绿 (Moss Green)', nameEn: 'Shubbery Moss Green', hex: '#1b5e20' },
      { name: '睡莲粉红 (Lotus Pink)', nameEn: 'Charming Lotus Pink', hex: '#f8bbd0' },
      { name: '波光淡青 (Water Ripple)', nameEn: 'Soft Cyan Ripples', hex: '#80deea' },
      { name: '幻梦幽紫 (Dreamy Violet)', nameEn: 'Mystic Violet Shadow', hex: '#4a148c' },
    ],
  },
  {
    id: 'thekiss',
    name: '吻 (The Kiss)',
    nameEn: 'The Kiss',
    artist: '古斯塔夫·克里姆特',
    artistEn: 'Gustav Klimt',
    year: '1908',
    description: '克里姆特的黄金巅峰杰作，整幅画布缀满了斑斓细碎的抽象几何色块和耀眼的金箔！本关开始时被完全遮盖，复苏 40% 进度后即可激活随机大门逃出！',
    descriptionEn: 'Klimt\'s golden masterpiece, embellished with shimmering geometric patches and brilliant gold leaf! The canvas is initially covered: restore 40% of the painting to unlock the exit portal!',
    url: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?q=80&w=800&auto=format&fit=crop',
    difficulty: '大师',
    backgroundColor: 'bg-amber-950/40',
    guardCount: 5,
    guardSpeed: 1.5,
    visionRange: 195,
    restorationTargetPercent: 40,
    duelEnabled: true,
    proceduralType: 'thekiss',
    palette: [
      { name: '黄金之海 (Gold)', nameEn: 'Golden Leaf', hex: '#d4af37' },
      { name: '复古藤黄 (Amber)', nameEn: 'Amber Yellow', hex: '#e5a93b' },
      { name: '情人娇粉 (Rose Pink)', nameEn: 'Lover Rose Pink', hex: '#f48fb1' },
      { name: '斑斓石绿 (Teal Mosaic)', nameEn: 'Teal Mosaic', hex: '#26a69a' },
      { name: '深泥之褐 (Brown Soil)', nameEn: 'Dark Umber', hex: '#664c12' },
    ],
  },
  {
    id: 'venus',
    name: '维纳斯的诞生 (The Birth of Venus)',
    nameEn: 'The Birth of Venus',
    artist: '桑德罗·波提切利',
    artistEn: 'Sandro Botticelli',
    year: '1486',
    description: '波提切利的文艺复兴巅峰巨制，柔和的海风、巨大的粉红贝壳和飘零的玫瑰花瓣构成了极致优雅的唯美画面。本关同样为遮盖色彩复苏玩法，复苏 50% 后开启出口，警惕 5 名极速变线的高警惕安保！',
    descriptionEn: 'Botticelli\'s Renaissance masterpiece capturing wind ripples, a colossal scallop shell, and drifting pink petals. Recover 50% of this elegant sea canvas to trigger the exit door while dodging 5 agile guards.',
    url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=800&auto=format&fit=crop',
    difficulty: '大师',
    backgroundColor: 'bg-teal-950/40',
    guardCount: 5,
    guardSpeed: 1.55,
    visionRange: 200,
    restorationTargetPercent: 50,
    duelEnabled: true,
    proceduralType: 'venus',
    palette: [
      { name: '维纳斯肤 (Venus Flesh)', nameEn: 'Delicate Skin', hex: '#ffebee' },
      { name: '金发波涛 (Venus Gold Hair)', nameEn: 'Golden Hair Wave', hex: '#fada43' },
      { name: '深海碧波 (Sea Green)', nameEn: 'Ocean Green', hex: '#b2dfdb' },
      { name: '花瓣绯红 (Rose Petal)', nameEn: 'Sanguine Rose', hex: '#ff80ab' },
      { name: '贝壳粉白 (Shell Pink)', nameEn: 'Scallop Pearl Shell', hex: '#ffcdd2' },
    ],
  },
  {
    id: 'liberty',
    name: '自由引导人民',
    nameEn: 'Liberty Leading the People',
    artist: '欧仁·德拉克罗瓦',
    artistEn: 'Eugène Delacroix',
    year: '1830',
    description: '表现浪漫主义史诗般宏大革命场景的名画。硝烟滚滚的战场，迎风挥舞的三色国旗。超高警卫巡逻网，面对极其强烈的红蓝白和硝烟泥色冲突，吸色复苏 60% 方可开启随机大门！',
    descriptionEn: 'A romantic epic capturing the smoke of battle and the tricolor flag. Navigate a tight 6-guard grid, shifting dynamically between democratic blues, revolutionary reds, and dusty smoke. 60% recovery required.',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop',
    difficulty: '噩梦',
    backgroundColor: 'bg-stone-900/50',
    guardCount: 6,
    guardSpeed: 1.6,
    visionRange: 200,
    restorationTargetPercent: 60,
    duelEnabled: true,
    proceduralType: 'liberty',
    palette: [
      { name: '自由之赤 (Liberty Red)', nameEn: 'Revolutionary Red', hex: '#c53030' },
      { name: '民主深蓝 (Democratic Blue)', nameEn: 'Flag Blue', hex: '#0f4c81' },
      { name: '硝烟迷雾 (Smoky Grey)', nameEn: 'Powder Smoke', hex: '#8a7056' },
      { name: '暗影余烬 (Dusk Umber)', nameEn: 'Ashen Charcoal', hex: '#1a202c' },
      { name: '黎明微光 (Dawn Glow)', nameEn: 'Gleaming White', hex: '#f7fafc' },
    ],
  },
  {
    id: 'persistence',
    name: '记忆的永恒 (The Persistence of Memory)',
    nameEn: 'The Persistence of Memory',
    artist: '萨尔瓦多·达利',
    artistEn: 'Salvador Dalí',
    year: '1931',
    description: '达利超现实主义代表作，歪曲融化的怀表、枯萎的橄榄树和泛着诡异蓝光的卡达克斯海岸。在此幻梦场景中，你需要避开 6 名全方位扫描的红外手电警卫，复苏 75% 的神秘梦境！',
    descriptionEn: 'Dalí\'s surreal masterpiece features melting watches, a withered olive branch, and eerie coastal blues. Dodge 6 high-vigilance guards scanning in every direction while restoring 75% of this bizarre landscape.',
    url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=800&auto=format&fit=crop',
    difficulty: '噩梦',
    backgroundColor: 'bg-yellow-950/30',
    guardCount: 6,
    guardSpeed: 1.65,
    visionRange: 205,
    restorationTargetPercent: 75,
    duelEnabled: true,
    proceduralType: 'persistence',
    palette: [
      { name: '荒漠暖黄 (Desert Sand)', nameEn: 'Warm Desert Sand', hex: '#e2b36e' },
      { name: '凝固冷蓝 (Catalan Sea)', nameEn: 'Frozen Catalan Blue', hex: '#0f3c5f' },
      { name: '融化银盘 (Melting Silver)', nameEn: 'Melting Clock Face', hex: '#ffffff' },
      { name: '枯木深褐 (Olive Bark)', nameEn: 'Dead Tree Trunk', hex: '#5d4037' },
      { name: '悬崖夕照 (Dali Ochre)', nameEn: 'Cliff Ochre', hex: '#df8f3d' },
    ],
  },
  {
    id: 'cafeterrace',
    name: '夜间咖啡馆 (Café Terrace at Night)',
    nameEn: 'Café Terrace at Night',
    artist: '文森特·梵高',
    artistEn: 'Vincent van Gogh',
    year: '1888',
    description: '文森特·梵高在阿尔勒创作的传世杰作。深邃高贵的幽蓝星空与露台温暖夺目的明黄色灯光产生极致强烈的冷暖对撞。在 6 名顶配警卫的探照网中，潜行复苏 90% 的星夜露台吧！',
    descriptionEn: 'Van Gogh\'s masterpiece in Arles contrasting deep cobalt skies with warm yellow café lamps. Dodge 6 supreme guards and recover 90% of this iconic starry terrace to unlock the escape portal!',
    url: 'https://images.unsplash.com/photo-1549887534-1541e9326642?q=80&w=800&auto=format&fit=crop',
    difficulty: '噩梦',
    backgroundColor: 'bg-blue-950/50',
    guardCount: 6,
    guardSpeed: 1.7,
    visionRange: 210,
    restorationTargetPercent: 90,
    duelEnabled: true,
    proceduralType: 'cafeterrace',
    palette: [
      { name: '露台暖金 (Cafe Gold)', nameEn: 'Terrace Amber Gold', hex: '#ffc107' },
      { name: '梵高星月 (Starlight Yellow)', nameEn: 'Vibrant Star Yellow', hex: '#fada43' },
      { name: '深邃夜空 (Cobalt Midnight)', nameEn: 'Deep Cobalt Night', hex: '#0c1446' },
      { name: '青石砖道 (Cobblestone)', nameEn: 'Cobblestone Teal', hex: '#00796b' },
      { name: '咖啡桌褐 (Cafe Terracotta)', nameEn: 'Rust Terracotta', hex: '#bf360c' },
    ],
  },
  {
    id: 'earthlydelights',
    name: '人间乐园 (Garden of Earthly Delights)',
    nameEn: 'Garden of Earthly Delights',
    artist: '希罗尼穆斯·博斯',
    artistEn: 'Hieronymus Bosch',
    year: '1490-1510',
    description: '以博斯三联画为灵感的原创抽象关卡：黑暗展厅中漂浮着粉色果实、青绿色水域和碎片化的奇异建筑。复苏 70% 后开启出口，新的巡逻兵开始拥有不同能力。',
    descriptionEn: 'An original abstract homage to Bosch: pink fruit moons, teal water ruins, and strange fractured architecture float in a dark museum arena. Restore 70% to open the portal while upgraded guards begin to appear.',
    url: 'https://www.museodelprado.es/en/the-collection/art-work/the-garden-of-earthly-delights-triptych/02388242-6d6a-4e9e-a992-e1311eab3609',
    difficulty: '噩梦',
    backgroundColor: 'bg-fuchsia-950/40',
    guardCount: 6,
    guardSpeed: 1.72,
    visionRange: 210,
    restorationTargetPercent: 70,
    guardMix: ['inspector', 'sweeper', 'curator', 'inspector', 'sweeper', 'sentinel'],
    duelEnabled: true,
    proceduralType: 'earthlydelights',
    palette: [
      { name: '乐园粉果 (Fruit Rose)', nameEn: 'Fruit Rose', hex: '#f472b6' },
      { name: '异界青池 (Teal Pool)', nameEn: 'Alien Teal Pool', hex: '#14b8a6' },
      { name: '贝壳白塔 (Shell Ivory)', nameEn: 'Shell Ivory', hex: '#fff7ed' },
      { name: '夜幕紫黑 (Abyss Violet)', nameEn: 'Abyss Violet', hex: '#1e1033' },
      { name: '酸性新绿 (Acid Leaf)', nameEn: 'Acid Leaf', hex: '#a3e635' },
    ],
  },
  {
    id: 'temeraire',
    name: '战舰归航 (The Fighting Temeraire)',
    nameEn: 'The Fighting Temeraire',
    artist: '约瑟夫·马洛德·威廉·透纳',
    artistEn: 'J. M. W. Turner',
    year: '1839',
    description: '以透纳的黄昏名作为灵感，重做成霓虹雾海、金色残阳和幽灵战舰剪影。复苏 75% 后开门，宽扇形扫描的巡逻兵会压缩行动空间。',
    descriptionEn: 'A neon fog-sea homage to Turner, with a ghost ship silhouette and molten sunset fragments. Restore 75% to open the portal while wide sweeping patrols compress your route.',
    url: 'https://www.nationalgallery.org.uk/paintings/joseph-mallord-william-turner-the-fighting-temeraire',
    difficulty: '噩梦',
    backgroundColor: 'bg-orange-950/40',
    guardCount: 6,
    guardSpeed: 1.76,
    visionRange: 215,
    restorationTargetPercent: 75,
    guardMix: ['sweeper', 'inspector', 'sentinel', 'curator', 'sweeper', 'inspector'],
    duelEnabled: true,
    proceduralType: 'temeraire',
    palette: [
      { name: '残阳熔金 (Molten Sun)', nameEn: 'Molten Sun', hex: '#f59e0b' },
      { name: '暮海钴蓝 (Dusk Cobalt)', nameEn: 'Dusk Cobalt', hex: '#1d4ed8' },
      { name: '蒸汽玫瑰 (Steam Rose)', nameEn: 'Steam Rose', hex: '#fb7185' },
      { name: '舰影黑蓝 (Hull Shadow)', nameEn: 'Hull Shadow', hex: '#111827' },
      { name: '雾光银白 (Fog Silver)', nameEn: 'Fog Silver', hex: '#e5e7eb' },
    ],
  },
  {
    id: 'grandjatte',
    name: '大碗岛星期日 (La Grande Jatte)',
    nameEn: 'A Sunday on La Grande Jatte',
    artist: '乔治·修拉',
    artistEn: 'Georges Seurat',
    year: '1884-1886',
    description: '以点彩法名作为灵感，但重构成高密度发光点阵、公园剪影和断裂色带。复苏 80% 后开门，策展人会擦除局部复苏屏障。',
    descriptionEn: 'A pointillist classic reimagined as luminous dot grids, park silhouettes, and fractured color bands. Restore 80% to open the portal while curators erase small restored barriers.',
    url: 'https://www.artic.edu/artworks/27992/a-sunday-on-la-grande-jatte-1884',
    difficulty: '噩梦',
    backgroundColor: 'bg-emerald-950/40',
    guardCount: 6,
    guardSpeed: 1.8,
    visionRange: 215,
    restorationTargetPercent: 80,
    guardMix: ['curator', 'sweeper', 'inspector', 'drone', 'curator', 'sentinel'],
    duelEnabled: true,
    proceduralType: 'grandjatte',
    palette: [
      { name: '点彩湖蓝 (Point Blue)', nameEn: 'Point Blue', hex: '#38bdf8' },
      { name: '草地荧绿 (Park Green)', nameEn: 'Park Green', hex: '#22c55e' },
      { name: '伞面朱红 (Parasol Red)', nameEn: 'Parasol Red', hex: '#ef4444' },
      { name: '午后奶黄 (Afternoon Cream)', nameEn: 'Afternoon Cream', hex: '#fde68a' },
      { name: '剪影墨黑 (Figure Ink)', nameEn: 'Figure Ink', hex: '#111827' },
    ],
  },
  {
    id: 'composition8',
    name: '构成8号 (Composition 8)',
    nameEn: 'Composition 8',
    artist: '瓦西里·康定斯基',
    artistEn: 'Wassily Kandinsky',
    year: '1923',
    description: '现代抽象致敬关：圆、三角、锐线和几何声波在黑色展厅里震荡。复苏 85% 后开门，无视屏障的无人机开始加入巡逻。',
    descriptionEn: 'A modern abstract homage of circles, triangles, knife-lines, and geometric sound waves vibrating in a black museum field. Restore 85% while drones start ignoring restored barriers.',
    url: 'https://www.guggenheim.org/artwork/1924',
    difficulty: '噩梦',
    backgroundColor: 'bg-slate-950/50',
    guardCount: 6,
    guardSpeed: 1.84,
    visionRange: 220,
    restorationTargetPercent: 85,
    guardMix: ['drone', 'sentinel', 'sweeper', 'curator', 'drone', 'inspector'],
    duelEnabled: true,
    proceduralType: 'composition8',
    palette: [
      { name: '构成红 (Construct Red)', nameEn: 'Construct Red', hex: '#ef4444' },
      { name: '几何蓝 (Geometry Blue)', nameEn: 'Geometry Blue', hex: '#2563eb' },
      { name: '圆相金 (Orbit Gold)', nameEn: 'Orbit Gold', hex: '#facc15' },
      { name: '音线黑 (Line Black)', nameEn: 'Line Black', hex: '#020617' },
      { name: '粉墙白 (Gallery White)', nameEn: 'Gallery White', hex: '#f8fafc' },
    ],
  },
  {
    id: 'boogiewoogie',
    name: '百老汇爵士 (Broadway Boogie Woogie)',
    nameEn: 'Broadway Boogie Woogie',
    artist: '皮特·蒙德里安',
    artistEn: 'Piet Mondrian',
    year: '1942-1943',
    description: '以蒙德里安城市网格为灵感的原创赛道：黄线、红蓝信号块和脉冲方格构成爵士迷宫。复苏 90% 后开门，固定旋转探照哨制造节拍压力。',
    descriptionEn: 'An original city-grid arena inspired by Mondrian: yellow rails, red-blue signals, and pulsing square traffic become a jazz maze. Restore 90% while sentinels scan on the beat.',
    url: 'https://www.moma.org/collection/works/78682',
    difficulty: '噩梦',
    backgroundColor: 'bg-yellow-950/30',
    guardCount: 6,
    guardSpeed: 1.88,
    visionRange: 225,
    restorationTargetPercent: 90,
    guardMix: ['sentinel', 'drone', 'sweeper', 'sentinel', 'curator', 'drone'],
    duelEnabled: true,
    proceduralType: 'boogiewoogie',
    palette: [
      { name: '爵士黄轨 (Jazz Yellow)', nameEn: 'Jazz Yellow', hex: '#fde047' },
      { name: '信号红块 (Signal Red)', nameEn: 'Signal Red', hex: '#dc2626' },
      { name: '电车蓝格 (Transit Blue)', nameEn: 'Transit Blue', hex: '#2563eb' },
      { name: '街区白光 (Block White)', nameEn: 'Block White', hex: '#f8fafc' },
      { name: '夜路黑线 (Night Grid)', nameEn: 'Night Grid', hex: '#020617' },
    ],
  },
  {
    id: 'redstudio',
    name: '红色画室 (The Red Studio)',
    nameEn: 'The Red Studio',
    artist: '亨利·马蒂斯',
    artistEn: 'Henri Matisse',
    year: '1911',
    description: '以马蒂斯画室为灵感的终章：整座展厅变成红色平面，画框、桌椅和作品轮廓像迷宫一样漂浮。复苏 95% 后开门，所有高级巡逻能力混合出现。',
    descriptionEn: 'The finale turns the museum into a red studio plane: frames, chairs, tables, and artwork outlines float like a maze. Restore 95% while every advanced guard type appears together.',
    url: 'https://www.moma.org/collection/works/78389',
    difficulty: '噩梦',
    backgroundColor: 'bg-red-950/50',
    guardCount: 6,
    guardSpeed: 1.92,
    visionRange: 230,
    restorationTargetPercent: 95,
    guardMix: ['sentinel', 'curator', 'drone', 'sweeper', 'curator', 'sentinel'],
    duelEnabled: true,
    proceduralType: 'redstudio',
    palette: [
      { name: '画室深红 (Studio Red)', nameEn: 'Studio Red', hex: '#b91c1c' },
      { name: '线稿粉白 (Outline Pink)', nameEn: 'Outline Pink', hex: '#fecdd3' },
      { name: '冷画框蓝 (Frame Blue)', nameEn: 'Frame Blue', hex: '#1d4ed8' },
      { name: '椅面酸绿 (Chair Lime)', nameEn: 'Chair Lime', hex: '#84cc16' },
      { name: '夜影墨棕 (Shadow Umber)', nameEn: 'Shadow Umber', hex: '#292524' },
    ],
  }
];

const TRANSLATIONS = {
  zh: {
    welcomeTitle: '潜入传世名作，化身完美伪装！',
    lobbySubTitle: '艺术变色龙名画隐藏计划',
    exhibitionHeading: '🏛️ 艺术馆展厅 · 关卡选择 EXHIBITION GALLERIES',
    title: '艺术变色龙：隐蔽突袭',
    subtitle: 'ART CHAMELEON: COVERT CAMOUFLAGE',
    intro: '化身拥有变色天赋的黏土小人，避开巡逻警卫的手电筒探照灯，在名画中收集能量球或复苏画作，逃出展厅完成艺术修复！',
    rule1: '使用 W/A/S/D 移动，普通关收集能量球，复苏关恢复画作',
    rule2: '按 空格 / F键 吸色伪装 (持续6秒)',
    rule3: '警卫靠近时 保持绝对静止 寻找隐藏出口',
    stealthGuide: '隐藏指南 STEALTH GUIDE',
    artPlaque: '艺术科普 Plaque',
    backToLobby: '🏛️ 返回艺术展厅大堂 Lobby',
    restart: '重新体验',
    nextLevel: '下一幅名画',
    tryAgain: '重新隐藏 Try Again',
    backToLobbyBtn: '🏛️ 返回大堂',
    victoryReset: '🔄 重置并重新挑战全关卡 Reset Game',
    spotted: '惊动了警卫！SPOTTED!',
    tipTitle: '💡 通关秘籍：',
    tipDesc: '看准警卫的走位！手电扫来时快速吸色并松开键盘原地不动，等手电移开后再快速去吃球！',
    successTitle: '修复成功！CLEAR!',
    successDesc: '你成功在这幅伟大的画作中隐藏了自己，搜集齐了褪色的斑斓色彩碎片，完成了画作维护！',
    currentPainting: '当前画作:',
    paintingDifficulty: '画作难度:',
    levelsClearedStats: '通关总层数:',
    victoryTitle: '恭喜！全馆馆藏完美修复！',
    victoryDesc: '简直不可思议！你穿行于世界最顶级的沙龙，在蒙娜丽莎的温婉浅笑、梵高的浩瀚星空与葛饰北斋的万丈狂澜中，凭借惊为天人的变色天赋，完美闪避了所有的保安追查，堪称艺术界的“变色龙怪盗”！',
    statsLevels: 'LEVELS',
    statsTime: 'ELAPSED TIME',
    guardCount: '🕵️ 守卫：',
    guardSpeed: '⚡ 速度：',
    enterGallery: '潜入画作 Enter Gallery',
    guidePoint1: '一键伪装：',
    guidePoint1Desc: '站在色块上随时按【空格 / F 键】或在画面点击，吸色并染色（持续 6 秒）。',
    guidePoint2: '静止不露：',
    guidePoint2Desc: '被手电筒照到时，必须停止按键并保持绝对静止！若有微小移动会立刻被抓。',
    guidePoint3: '颜色匹配：',
    guidePoint3Desc: '若身上的颜色与脚下背景色相差过大，即使你保持静止，警惕值也会缓慢上升。',
    guidePoint4: '逃离名画：',
    guidePoint4Desc: '普通关收集齐 3 个能量球开门；复苏关达到画作复苏目标后开门，然后走入出口通关。',
    quote: '“艺术是隐藏自我的最高境界，当你成为色彩的一部分，你就成为了不朽。”',
    difficultyBadge: {
      '简单': '简单 ✦',
      '中等': '中等 ✦✦',
      '困难': '困难 ✦✦✦',
      '大师': '大师 ✦✦✦✦',
      '噩梦': '噩梦 ✦✦✦✦✦'
    },
    difficultyEn: {
      '简单': 'Easy',
      '中等': 'Medium',
      '困难': 'Hard',
      '大师': 'Master',
      '噩梦': 'Nightmare'
    },
    speedSlow: '慢',
    speedMedium: '中',
    speedFast: '极快',
    years: ' 年',
    footerCalibration: 'CALIBRATING VISUAL SENSORS ... SECURITY SYSTEMS ONLINE ... CAMOUFLAGE INTEGRITY AT 100%',
    footerSystem: '© 2026 艺术变色龙美术馆馆藏管理系统. 致敬 MECCHA CHAMELEON 经典核心机制.',
    footerTech: 'HTML5 Canvas 逐像素取色渲染技术 · 跨域安全沙箱',
    gCountLabel: '人',
    lobbyText: '大堂 LOBBY',
    tipLabel: '小窍门 TIP:',
    tipSub: '被手电照到时，千万不要按方向键移动。'
  },
  en: {
    welcomeTitle: 'Infiltrate Masterpieces, Become Perfect Camouflage!',
    lobbySubTitle: 'Art Chameleon Masterpiece Stealth Plan',
    exhibitionHeading: '🏛️ EXHIBITION GALLERIES · SELECT PAINTING',
    title: 'Art Chameleon: Covert Camouflage',
    subtitle: 'ART CHAMELEON: COVERT CAMOUFLAGE',
    intro: 'Play as a clay figure with ultimate color-matching talent. Avoid patrol guard searchlights, collect energy shards or restore covered masterpieces, then escape to complete the restoration!',
    rule1: 'Use W/A/S/D to move, collect orbs in classic levels, and restore covered artworks in restoration levels',
    rule2: 'Press SPACE / F to absorb background color (lasts 6s)',
    rule3: 'Stay absolutely still when guards scan you, then find the exit',
    stealthGuide: 'STEALTH GUIDE',
    artPlaque: 'ART WORK PLAQUE',
    backToLobby: '🏛️ Return to Art Lobby',
    restart: 'Retry Level',
    nextLevel: 'Next Masterpiece',
    tryAgain: 'Try Again',
    backToLobbyBtn: '🏛️ Lobby',
    victoryReset: '🔄 Reset & Challenge Gallery Again',
    spotted: 'SPOTTED!',
    tipTitle: '💡 Master Tip:',
    tipDesc: 'Observe the guard patrol paths! When the searchlight sweeps over you, absorb the color underneath and release all keys immediately. Move only when safe!',
    successTitle: 'RESTORED SUCCESSFULLY!',
    successDesc: 'You successfully blended into this great masterpiece, gathered all color shards, and restored the original artwork!',
    currentPainting: 'Artwork:',
    paintingDifficulty: 'Difficulty:',
    levelsClearedStats: 'Levels Cleared:',
    victoryTitle: 'CONGRATULATIONS! ALL ARTWORKS RESTORED!',
    victoryDesc: 'Incredible! You made your way through the world\'s most prestigious salons—from the subtle smile of Mona Lisa, to Van Gogh\'s swirling cosmos, and Hokusai\'s roaring wave. With your breathtaking camouflage skills, you avoided all guards and became the legendary chameleon art thief!',
    statsLevels: 'LEVELS',
    statsTime: 'ELAPSED TIME',
    guardCount: '🕵️ Guards: ',
    guardSpeed: '⚡ Speed: ',
    enterGallery: 'Enter Gallery',
    guidePoint1: 'Camouflage:',
    guidePoint1Desc: 'Stand on any color and press [SPACE / F Key] or click on the canvas to absorb and apply the background color (lasts 6 seconds).',
    guidePoint2: 'Freeze Motion:',
    guidePoint2Desc: 'When swept by the searchlight, you must immediately stop moving! Any minor movement will trigger an instant alarm.',
    guidePoint3: 'Color Matching:',
    guidePoint3Desc: 'If your camouflage color doesn\'t match the floor color, the guards\' alertness will slowly rise even if you are stationary.',
    guidePoint4: 'Masterpiece Escape:',
    guidePoint4Desc: 'Classic levels open after 3 energy orbs; restoration levels open after the target artwork recovery, then you must enter the portal.',
    quote: '"Art is the highest realm of hiding oneself; when you become part of the color, you become immortal."',
    difficultyBadge: {
      '简单': 'Easy ✦',
      '中等': 'Medium ✦✦',
      '困难': 'Hard ✦✦✦',
      '大师': 'Master ✦✦✦✦',
      '噩梦': 'Nightmare ✦✦✦✦✦'
    },
    difficultyEn: {
      '简单': 'Easy',
      '中等': 'Medium',
      '困难': 'Hard',
      '大师': 'Master',
      '噩梦': 'Nightmare'
    },
    speedSlow: 'Slow',
    speedMedium: 'Medium',
    speedFast: 'Extreme',
    years: '',
    footerCalibration: 'CALIBRATING VISUAL SENSORS ... SECURITY SYSTEMS ONLINE ... CAMOUFLAGE INTEGRITY AT 100%',
    footerSystem: '© 2026 Art Chameleon Masterpiece System. Tribute to MECCHA CHAMELEON mechanics.',
    footerTech: 'HTML5 Canvas Pixel-by-Pixel Camouflage Rendering Engine',
    gCountLabel: ' Guards',
    lobbyText: 'LOBBY',
    tipLabel: 'TIP:',
    tipSub: 'When the flashlight scans you, do NOT press any keys.'
  }
};

export const MuseumGallery: React.FC = () => {
  const [initialSave] = useState<GallerySave | null>(() => readSavedGame());
  const skipNextSaveRef = useRef(false);
  const initialUnlockedLevelCount = Math.max(
    1,
    Math.min(PAINTINGS_GALLERY.length, initialSave?.unlockedLevelCount ?? 1)
  );
  const savedLevelIndex = initialSave?.levelIndex ?? 0;
  const isSavedLevelUnlocked = savedLevelIndex >= 0 && savedLevelIndex < initialUnlockedLevelCount;
  const initialLevelIndex = isSavedLevelUnlocked
    ? Math.max(0, Math.min(PAINTINGS_GALLERY.length - 1, savedLevelIndex))
    : 0;
  const [lang, setLang] = useState<'zh' | 'en'>(initialSave?.lang ?? 'en');
  const [activePainting, setActivePainting] = useState<PaintingData>(PAINTINGS_GALLERY[initialLevelIndex]);
  const [gameState, setGameState] = useState<GameState>(isSavedLevelUnlocked ? (initialSave?.gameState ?? 'welcome') : 'welcome');
  const [levelIndex, setLevelIndex] = useState(initialLevelIndex);
  const [isMuted, setIsMuted] = useState(initialSave?.isMuted ?? false);
  const [failReason, setFailReason] = useState('');
  const [clearSummary, setClearSummary] = useState('');
  const [unlockedLevelCount, setUnlockedLevelCount] = useState(initialUnlockedLevelCount);
  const [currentMode, setCurrentMode] = useState<GameMode>('solo');
  
  // Stats
  const [stats, setStats] = useState<GalleryStats>(initialSave?.stats ?? DEFAULT_STATS);

  const [activeTab, setActiveTab] = useState<'game' | 'history'>('game');

  // Timer effect during active game
  useEffect(() => {
    let interval: any;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setStats(prev => ({ ...prev, secondsPlayed: prev.secondsPlayed + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Restore saved audio preference and keep it in sync with the UI state.
  useEffect(() => {
    audio.setMute(isMuted);
  }, [isMuted]);

  // Autosave a checkpoint-level snapshot. Per-frame canvas and guard state stay transient.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const save: GallerySave = {
      version: 1,
      levelIndex,
      gameState,
      stats,
      lang,
      isMuted,
      unlockedLevelCount,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }, [gameState, isMuted, lang, levelIndex, stats, unlockedLevelCount]);

  // Handle auto-bg music trigger
  useEffect(() => {
    if (gameState === 'playing') {
      audio.startMusic();
    } else {
      audio.stopMusic();
    }
    return () => audio.stopMusic();
  }, [gameState]);

  const handleStartGame = (painting: PaintingData, idx: number, mode: GameMode = 'solo') => {
    if (idx >= unlockedLevelCount) return;
    const supportedMode = mode === 'local-duel' && painting.duelEnabled ? 'local-duel' : 'solo';

    setActivePainting(painting);
    setLevelIndex(idx);
    setCurrentMode(supportedMode);
    setClearSummary('');
    setGameState('playing');
    setActiveTab('game');
    audio.playCollect();
  };

  const handleLevelCleared = (summary?: string) => {
    setClearSummary(summary ?? '');
    setStats(prev => ({ ...prev, levelsCleared: Math.max(prev.levelsCleared, levelIndex + 1) }));
    setUnlockedLevelCount(prev => Math.min(PAINTINGS_GALLERY.length, Math.max(prev, levelIndex + 2)));
    
    // Check if there is a next level
    if (levelIndex < PAINTINGS_GALLERY.length - 1) {
      setGameState('cleared');
    } else {
      setGameState('victory');
    }
  };

  const handleGameOver = (reason: string) => {
    setStats(prev => ({ ...prev, timesSpotted: prev.timesSpotted + 1 }));
    setFailReason(reason);
    setGameState('failed');
  };

  const handleNextLevel = () => {
    const nextIdx = levelIndex + 1;
    if (nextIdx < PAINTINGS_GALLERY.length) {
      const nextPainting = PAINTINGS_GALLERY[nextIdx];
      const nextMode = currentMode === 'local-duel' && nextPainting.duelEnabled ? 'local-duel' : 'solo';
      handleStartGame(nextPainting, nextIdx, nextMode);
    }
  };

  const handleRestartLevel = () => {
    const restartMode = currentMode === 'local-duel' && activePainting.duelEnabled ? 'local-duel' : 'solo';
    handleStartGame(activePainting, levelIndex, restartMode);
  };

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleResetGallery = () => {
    skipNextSaveRef.current = true;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SAVE_KEY);
    }
    setStats(DEFAULT_STATS);
    setUnlockedLevelCount(1);
    setLevelIndex(0);
    setActivePainting(PAINTINGS_GALLERY[0]);
    setCurrentMode('solo');
    setFailReason('');
    setClearSummary('');
    setGameState('welcome');
  };

  const getDifficultyBadge = (diff: LevelDifficulty) => {
    const label = lang === 'zh' ? TRANSLATIONS.zh.difficultyBadge[diff] : TRANSLATIONS.en.difficultyBadge[diff];
    switch (diff) {
      case '简单':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">{label}</span>;
      case '中等':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-950 text-yellow-400 border border-yellow-800">{label}</span>;
      case '困难':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-950 text-orange-400 border border-orange-800">{label}</span>;
      case '大师':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">{label}</span>;
      case '噩梦':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-400 border border-purple-800 animate-pulse">{label}</span>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen text-[#f2f2f2] font-sans pb-12 px-4">
      {/* Museum Header with luxury modern-brutalist museum aesthetic */}
      <header className="w-full flex flex-col lg:flex-row items-center justify-between py-6 px-8 bg-[#0c0c0c] border-b border-white/10 mb-8 mt-4 gap-6 rounded-xl">
        <div className="flex items-center gap-5">
          {/* Rotated diamond/square modern-art logo element */}
          <div className="w-10 h-10 border-2 border-[#c5a059] flex items-center justify-center rotate-45 flex-shrink-0">
            <div className="w-6 h-6 bg-white rotate-[-45deg] flex items-center justify-center text-black font-serif font-black text-[10px] shadow-md">C</div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif tracking-wider font-bold italic text-white leading-none">
              CHAMELEON <span className="text-[#c5a059] font-normal not-italic font-sans text-xl tracking-[0.2em] ml-1">MUSEUM</span>
            </h1>
            <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase mt-1 font-mono">{TRANSLATIONS[lang].lobbySubTitle}</p>
          </div>
        </div>

        {/* Language selector toggle & Stats row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 lg:mt-0 w-full lg:w-auto justify-end">
          {/* Language Toggle */}
          <div className="flex bg-black/60 p-1 rounded-lg border border-white/10 self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setLang('zh')}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all tracking-wider ${
                lang === 'zh'
                  ? 'bg-[#c5a059] text-black shadow'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all tracking-wider ${
                lang === 'en'
                  ? 'bg-[#c5a059] text-black shadow'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* High-fidelity Dashboard Stats styled after the design spec */}
          <div className="flex gap-4 md:gap-8 bg-[#151515] px-5 py-2.5 border border-white/10 rounded-lg w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex flex-col items-end">
              <span className="opacity-50 text-[10px] tracking-widest font-mono">PHASE</span>
              <span className="text-sm font-mono text-white font-bold">
                {gameState === 'playing' ? `0${levelIndex + 1}: ${activePainting.id.toUpperCase()}` : '00: THE LOBBY'}
              </span>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="flex flex-col items-end">
              <span className="opacity-50 text-[10px] tracking-widest font-mono">CLEARED</span>
              <span className="text-sm font-mono text-[#c5a059] font-bold">{stats.levelsCleared} / {PAINTINGS_GALLERY.length}</span>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="flex flex-col items-end">
              <span className="opacity-50 text-[10px] tracking-widest font-mono">SPOTTED</span>
              <span className="text-sm font-mono text-rose-500 font-bold">{stats.timesSpotted}</span>
            </div>
            <div className="w-px bg-white/10 self-stretch" />
            <div className="flex flex-col items-end">
              <span className="opacity-50 text-[10px] tracking-widest font-mono">TIME</span>
              <span className="text-sm font-mono text-emerald-400 font-bold">
                {Math.floor(stats.secondsPlayed / 60)}:{String(stats.secondsPlayed % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Welcome / Level Selector View */}
        {gameState === 'welcome' && (
          <div className="lg:col-span-12 flex flex-col items-center justify-center py-4">
            {/* Elegant Hero Banner */}
            <div className="max-w-4xl text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-[#c5a059]/10 text-[#c5a059] px-4 py-1.5 rounded-full border border-[#c5a059]/20 text-xs font-mono tracking-widest uppercase mb-4 shadow-sm">
                <Sparkles size={14} className="animate-pulse" /> UNIQUE STEALTH CAMOUFLAGE EXPERIENCE
              </div>
              <h2 className="text-3xl md:text-5xl font-serif italic tracking-wider text-white leading-tight mb-4">
                {TRANSLATIONS[lang].welcomeTitle}
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto text-xs md:text-sm leading-relaxed font-sans">
                {TRANSLATIONS[lang].intro}
              </p>
            </div>

            {/* Concise Rules Bar */}
            <div className="bg-[#151515] p-5 rounded-xl border border-white/10 max-w-4xl w-full mb-10 flex flex-col sm:flex-row gap-6 items-center justify-around text-center sm:text-left">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a059] text-black text-xs font-bold flex items-center justify-center font-mono">1</span>
                <span className="text-xs text-white font-medium">
                  {lang === 'zh' ? '使用 ' : 'Use '}<strong className="text-[#c5a059]">W/A/S/D</strong>{lang === 'zh' ? ' 移动；普通关吃球，复苏关恢复画作' : ' to move; collect orbs or restore artworks'}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a059] text-black text-xs font-bold flex items-center justify-center font-mono">2</span>
                <span className="text-xs text-white font-medium">
                  {lang === 'zh' ? '按 ' : 'Press '}<strong className="text-[#c5a059]">{lang === 'zh' ? '空格 / F键' : 'SPACE / F'}</strong>{lang === 'zh' ? ' 吸色伪装 (持续6秒)' : ' to blend in (lasts 6s)'}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#c5a059] text-black text-xs font-bold flex items-center justify-center font-mono">3</span>
                <span className="text-xs text-white font-medium">
                  {lang === 'zh' ? '警卫靠近时 ' : 'When guards scan, '}<strong className="text-red-400">{lang === 'zh' ? '保持绝对静止' : 'stay absolutely still'}</strong>{lang === 'zh' ? ' 寻找隐藏出口' : ', then find the exit'}
                </span>
              </div>
            </div>

            {/* Level Exhibition Select */}
            <div className="w-full max-w-5xl">
              <h3 className="text-lg font-serif text-[#c5a059] tracking-wider uppercase mb-6 flex items-center gap-2">
                {TRANSLATIONS[lang].exhibitionHeading}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PAINTINGS_GALLERY.map((p, idx) => {
                  const pName = lang === 'en' ? (p.nameEn || p.name) : p.name;
                  const pArtist = lang === 'en' ? (p.artistEn || p.artist) : p.artist;
                  const pDesc = lang === 'en' ? (p.descriptionEn || p.description) : p.description;
                  const isUnlocked = idx < unlockedLevelCount;
                  const isCleared = idx < Math.max(0, unlockedLevelCount - 1);

                  return (
                    <div
                      key={p.id}
                      className={`bg-[#151515] border rounded-lg overflow-hidden transition-all duration-300 flex flex-col ${
                        isUnlocked
                          ? 'border-white/10 hover:border-[#c5a059]/50 hover:shadow-[0_0_25px_rgba(197,160,89,0.15)] hover:-translate-y-1'
                          : 'border-white/5 opacity-55 grayscale'
                      }`}
                    >
                      {/* Art preview frame */}
                      <div className="h-44 bg-black relative overflow-hidden group flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-1" />
                        <ProceduralArtThumbnail
                          type={p.proceduralType}
                          className={`opacity-75 transition-transform duration-500 ${isUnlocked ? 'group-hover:scale-105' : ''}`}
                        />
                        {/* Difficulty overlay */}
                        <div className="absolute top-3 right-3 z-10">
                          {getDifficultyBadge(p.difficulty)}
                        </div>
                        {isCleared && (
                          <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={12} /> {lang === 'en' ? 'CLEARED' : '已通关'}
                          </div>
                        )}
                        {!isUnlocked && (
                          <div className="absolute inset-0 z-20 bg-black/65 backdrop-blur-[1px] flex flex-col items-center justify-center text-center px-4">
                            <Lock size={26} className="text-[#c5a059] mb-2" />
                            <p className="text-[#c5a059] text-[11px] font-mono font-bold uppercase tracking-widest">
                              {lang === 'en' ? 'LOCKED' : '未解锁'}
                            </p>
                            <p className="text-white/55 text-[10px] mt-1">
                              {lang === 'en' ? 'Clear the previous artwork first' : '通关上一幅名画后解锁'}
                            </p>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 z-10 font-serif">
                          <p className="text-[#c5a059] text-[10px] tracking-widest uppercase font-mono">{pArtist}</p>
                          <h4 className="text-base font-bold text-white leading-tight italic">{pName}</h4>
                        </div>
                      </div>

                      {/* Description card details */}
                      <div className="p-4 flex-grow flex flex-col justify-between gap-3 bg-[#111111]">
                        {/* Minimal Guard / Speed Row */}
                        <div className="flex justify-between items-center text-[11px] font-mono text-white/40 bg-black/40 px-3 py-2 rounded border border-white/5">
                          <span className="text-[#c5a059]">
                            🕵️ {lang === 'en' ? `${p.guardCount} Guards` : `${p.guardCount}名警卫`}
                          </span>
                          <span className="text-[#c5a059]">
                            ⚡ {p.difficulty === '简单'
                              ? (lang === 'en' ? 'Slow' : '低速')
                              : p.difficulty === '中等'
                                ? (lang === 'en' ? 'Medium' : '中速')
                                : (lang === 'en' ? 'Fast' : '快速')}
                          </span>
                        </div>

                        {/* Play actions */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleStartGame(p, idx, 'solo')}
                            disabled={!isUnlocked}
                            aria-disabled={!isUnlocked}
                            className={`w-full py-2 font-bold text-xs uppercase tracking-widest rounded transition-all duration-200 flex items-center justify-center gap-1.5 shadow ${
                              isUnlocked
                                ? 'bg-[#c5a059] hover:bg-[#d4b06d] text-black'
                                : 'bg-black/50 text-white/30 border border-white/10 cursor-not-allowed'
                            }`}
                          >
                            {isUnlocked ? <Play size={12} /> : <Lock size={12} />}
                            {isUnlocked
                              ? TRANSLATIONS[lang].enterGallery
                              : (lang === 'en' ? 'LOCKED' : '未解锁')}
                          </button>
                          {p.duelEnabled && (
                            <button
                              onClick={() => handleStartGame(p, idx, 'local-duel')}
                              disabled={!isUnlocked}
                              aria-disabled={!isUnlocked}
                              className={`w-full py-2 font-bold text-xs uppercase tracking-widest rounded transition-all duration-200 flex items-center justify-center gap-1.5 border ${
                                isUnlocked
                                  ? 'bg-black/55 hover:bg-[#7c2d12]/60 text-amber-200 border-amber-500/40'
                                  : 'bg-black/50 text-white/25 border-white/10 cursor-not-allowed'
                              }`}
                            >
                              {isUnlocked ? <Sparkles size={12} /> : <Lock size={12} />}
                              {lang === 'en' ? 'LOCAL DUEL' : '本地双人对战'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Playing View */}
        {gameState === 'playing' && (
          <div className="lg:col-span-12 flex flex-col items-center justify-center w-full">
            {/* Active Play Header Actions */}
            <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between mb-4 px-2 gap-3">
              <button
                onClick={() => setGameState('welcome')}
                className="px-4 py-1.5 bg-black/40 hover:bg-black/80 text-white/75 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-all border border-white/10 flex items-center gap-1.5 font-sans"
              >
                ← {lang === 'en' ? 'BACK TO LOBBY' : '返回艺术大厅'}
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-serif italic text-[#c5a059] tracking-wider">
                  {lang === 'en' ? 'NOW RESTORING:' : '正在修复:'} <span className="text-white font-bold not-italic font-sans">{lang === 'en' ? (activePainting.nameEn || activePainting.name) : activePainting.name}</span>
                </span>
                {getDifficultyBadge(activePainting.difficulty)}
              </div>
            </div>

            {/* Centered Game Canvas */}
            <div className="w-full max-w-4xl flex flex-col">
              <GameCanvas
                painting={activePainting}
                mode={currentMode}
                onLevelCleared={handleLevelCleared}
                onGameOver={handleGameOver}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* Level Cleared Modal View */}
        {gameState === 'cleared' && (
          <div className="lg:col-span-12 flex flex-col items-center justify-center py-16">
            <div className="max-w-md w-full bg-[#151515] border border-[#c5a059] p-8 rounded-lg text-center shadow-2xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#c5a059] text-black rounded-lg flex items-center justify-center shadow-lg shadow-[#c5a059]/20 animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <h2 className="text-2xl font-serif text-[#c5a059] italic font-bold mt-4 mb-2">{TRANSLATIONS[lang].successTitle}</h2>
              <p className="text-xs text-white/60 font-mono mb-6">
                {TRANSLATIONS[lang].successDesc}
              </p>
              {clearSummary && (
                <p className="text-xs text-amber-200 bg-amber-950/20 border border-amber-700/30 p-2.5 rounded mb-6 leading-relaxed font-mono">
                  {clearSummary}
                </p>
              )}

              <div className="bg-black/60 p-4 rounded border border-white/10 text-left mb-6 space-y-2">
                <p className="text-xs font-mono flex justify-between text-white/50">
                  <span>{lang === 'en' ? 'Artwork:' : '当前画作:'}</span> <span className="text-white font-bold">{lang === 'en' ? (activePainting.nameEn || activePainting.name) : activePainting.name}</span>
                </p>
                <p className="text-xs font-mono flex justify-between text-white/50">
                  <span>{lang === 'en' ? 'Difficulty:' : '画作难度:'}</span> <span>{getDifficultyBadge(activePainting.difficulty)}</span>
                </p>
                <p className="text-xs font-mono flex justify-between text-white/50">
                  <span>{lang === 'en' ? 'Levels Cleared:' : '通关总层数:'}</span> <span className="text-[#c5a059] font-bold">{stats.levelsCleared} {lang === 'en' ? 'Level(s)' : '关'}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleRestartLevel}
                  className="flex-1 py-2.5 bg-black/40 hover:bg-black/60 border border-white/10 text-white/80 font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 text-xs"
                >
                  <RotateCcw size={14} /> {TRANSLATIONS[lang].restart}
                </button>
                <button
                  onClick={handleNextLevel}
                  className="flex-1 py-2.5 bg-[#c5a059] hover:bg-[#d4b06d] text-black font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1 text-xs"
                >
                  {TRANSLATIONS[lang].nextLevel} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Level Failed Modal View */}
        {gameState === 'failed' && (
          <div className="lg:col-span-12 flex flex-col items-center justify-center py-16">
            <div className="max-w-md w-full bg-[#151515] border border-rose-500/50 p-8 rounded-lg text-center shadow-2xl relative animate-shake">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-rose-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-rose-600/20">
                <AlertTriangle size={36} />
              </div>

              <h2 className="text-2xl font-serif text-rose-400 italic font-bold mt-4 mb-2">{TRANSLATIONS[lang].spotted}</h2>
              <p className="text-xs text-rose-300 bg-rose-950/20 border border-rose-900/30 p-2.5 rounded mb-6 leading-relaxed">
                {failReason}
              </p>

              <div className="bg-black/60 p-4 rounded border border-white/10 text-left mb-6 space-y-2.5">
                <p className="text-xs font-mono flex justify-between text-white/50">
                  <span>{lang === 'en' ? 'Failed Painting:' : '被捉画作:'}</span> <span className="text-white font-bold">{lang === 'en' ? (activePainting.nameEn || activePainting.name) : activePainting.name}</span>
                </p>
                <p className="text-xs font-mono flex justify-between text-white/50">
                  <span>{TRANSLATIONS[lang].tipLabel}</span> <span className="text-slate-300">{TRANSLATIONS[lang].tipSub}</span>
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setGameState('welcome')}
                  className="flex-1 py-2.5 bg-black/40 hover:bg-black/60 border border-white/10 text-white/80 font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 text-xs"
                >
                  {TRANSLATIONS[lang].backToLobbyBtn}
                </button>
                <button
                  onClick={handleRestartLevel}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-1.5 text-xs"
                >
                  <RotateCcw size={14} /> {TRANSLATIONS[lang].tryAgain}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Perfect Victory / Full Gallery Cleared Modal View */}
        {gameState === 'victory' && (
          <div className="lg:col-span-12 flex flex-col items-center justify-center py-16">
            <div className="max-w-lg w-full bg-[#151515] border border-[#c5a059] p-8 rounded-lg text-center shadow-2xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#c5a059] text-black rounded-lg flex items-center justify-center shadow-lg shadow-[#c5a059]/20">
                <Trophy size={36} />
              </div>

              <div className="inline-flex items-center gap-1 bg-[#c5a059]/10 text-[#c5a059] px-3 py-1 rounded text-[10px] font-mono border border-[#c5a059]/30 mb-2 mt-4 uppercase tracking-widest">
                🏆 MASTER CHAMELEON EMBLEM
              </div>
              <h2 className="text-3xl font-serif text-[#c5a059] italic font-black mb-2">{TRANSLATIONS[lang].victoryTitle}</h2>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                {TRANSLATIONS[lang].victoryDesc}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-black/60 p-4 rounded border border-white/10 text-center">
                  <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">{TRANSLATIONS[lang].statsLevels}</span>
                  <p className="text-2xl font-serif font-bold text-[#c5a059]">{stats.levelsCleared} / {PAINTINGS_GALLERY.length}</p>
                </div>
                <div className="bg-black/60 p-4 rounded border border-white/10 text-center">
                  <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">{TRANSLATIONS[lang].statsTime}</span>
                  <p className="text-2xl font-serif font-bold text-emerald-400">
                    {lang === 'en'
                      ? `${Math.floor(stats.secondsPlayed / 60)}m ${stats.secondsPlayed % 60}s`
                      : `${Math.floor(stats.secondsPlayed / 60)}分 ${stats.secondsPlayed % 60}秒`}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleResetGallery}
                  className="w-full py-3 bg-[#c5a059] hover:bg-[#d4b06d] text-black font-bold uppercase tracking-wider rounded-md transition-all shadow-md flex items-center justify-center gap-1.5 text-sm"
                >
                  {TRANSLATIONS[lang].victoryReset}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Immersive footer with system calibration look from Design Spec */}
      <footer className="w-full mt-12 overflow-hidden rounded-lg">
        <div className="bg-[#c5a059] py-2.5 flex items-center justify-between px-8 overflow-hidden whitespace-nowrap text-black font-mono font-black text-[9px] uppercase tracking-[0.3em] select-none">
          <div className="animate-[pulse_2.5s_infinite]">
            {TRANSLATIONS[lang].footerCalibration}
          </div>
          <div className="hidden md:block">
            ART-TECH SYSTEMS INC. v1.12
          </div>
        </div>
        <div className="w-full text-center text-[10px] text-white/30 font-mono flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-[#0d0d0d] border border-white/5 mt-1 rounded-b-lg">
          <p>{TRANSLATIONS[lang].footerSystem}</p>
          <p className="mt-1 sm:mt-0 text-[#c5a059]/70 font-semibold">
            {TRANSLATIONS[lang].footerTech}
          </p>
        </div>
      </footer>
    </div>
  );
};
