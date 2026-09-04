export interface PresetAvatar {
  id: string;
  name: string;
  category: 'boys' | 'girls';
  url: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // Boys
  { id: 'memoji_1', name: 'Алекс (Улыбка)', category: 'boys', url: '/avatars/memoji_1.png' },
  { id: 'memoji_3', name: 'Алекс (Кэжуал)', category: 'boys', url: '/avatars/memoji_3.png' },
  { id: 'memoji_5', name: 'Алекс (Очки)', category: 'boys', url: '/avatars/memoji_5.png' },
  { id: 'memoji_7', name: 'Алекс (Стильный)', category: 'boys', url: '/avatars/memoji_7.png' },
  { id: 'memoji_9', name: 'Алекс (Кепка)', category: 'boys', url: '/avatars/memoji_9.png' },
  { id: 'memoji_11', name: 'Алекс (Худи)', category: 'boys', url: '/avatars/memoji_11.png' },
  { id: 'memoji_13', name: 'Алекс (Кудри)', category: 'boys', url: '/avatars/memoji_13.png' },
  { id: 'memoji_15', name: 'Алекс (Подмигивание)', category: 'boys', url: '/avatars/memoji_15.png' },
  { id: 'memoji_17', name: 'Алекс (Борода)', category: 'boys', url: '/avatars/memoji_17.png' },
  { id: 'memoji_19', name: 'Алекс (Звездный)', category: 'boys', url: '/avatars/memoji_19.png' },
  { id: 'memoji_25', name: 'Алекс (Наушники)', category: 'boys', url: '/avatars/memoji_25.png' },
  { id: 'memoji_45', name: 'Алекс (Шапка)', category: 'boys', url: '/avatars/memoji_45.png' },

  // Girls
  { id: 'memoji_2', name: 'Мария (Брюнетка)', category: 'girls', url: '/avatars/memoji_2.png' },
  { id: 'memoji_4', name: 'Мария (Улыбка)', category: 'girls', url: '/avatars/memoji_4.png' },
  { id: 'memoji_6', name: 'Мария (Блондинка)', category: 'girls', url: '/avatars/memoji_6.png' },
  { id: 'memoji_8', name: 'Мария (Очки)', category: 'girls', url: '/avatars/memoji_8.png' },
  { id: 'memoji_10', name: 'Мария (Каре)', category: 'girls', url: '/avatars/memoji_10.png' },
  { id: 'memoji_12', name: 'Мария (Хвостик)', category: 'girls', url: '/avatars/memoji_12.png' },
  { id: 'memoji_14', name: 'Мария (Косички)', category: 'girls', url: '/avatars/memoji_14.png' },
  { id: 'memoji_16', name: 'Мария (Воздушный поцелуй)', category: 'girls', url: '/avatars/memoji_16.png' },
  { id: 'memoji_18', name: 'Мария (Сердечки)', category: 'girls', url: '/avatars/memoji_18.png' },
  { id: 'memoji_20', name: 'Мария (Челка)', category: 'girls', url: '/avatars/memoji_20.png' },
  { id: 'memoji_30', name: 'Мария (Шляпка)', category: 'girls', url: '/avatars/memoji_30.png' },
  { id: 'memoji_50', name: 'Мария (Шатенка)', category: 'girls', url: '/avatars/memoji_50.png' },
];

export function getAvatarUrl(avatarId: string): string {
  // If it's already a full URL or path
  if (avatarId.startsWith('/') || avatarId.startsWith('http')) {
    return avatarId;
  }
  const found = PRESET_AVATARS.find((a) => a.id === avatarId);
  return found ? found.url : PRESET_AVATARS[0].url;
}
