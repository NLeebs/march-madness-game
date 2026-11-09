export const averageScore = (userScores: number[]) => {
  const average = userScores.reduce((sum, score) => sum + score) / Math.max(userScores.length, 1);

  return Math.round(average);
}

export const calculatePercentage = (partial: number, total: number): number => {
  if (total === 0) return 0;

  const rawPercentage = (partial / total) * 100;
  return +rawPercentage.toFixed(1);
}

export const mostFrequentId = (ids: string[]) => {
  if (ids.length === 0) return null;

  const{ maxId } = mostFrequent(ids);

  return maxId;
};

export const frequencyOfIds = (ids: string[]) => {
  if (ids.length === 0) return null;

  const { maxCount } = mostFrequent(ids);

  return maxCount;
}

const mostFrequent = (ids: string[]) => {
  const counts = new Map<string, number>();
  let maxId: string | null = null;
  let maxCount = 0;

  for (const id of ids) {
    const count = (counts.get(id) ?? 0) + 1;
    counts.set(id, count);

    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }

  return {maxId, maxCount};
}

export const groupUsersByYear = <T>(
  userStatsMap: Map<string, T>
): Map<string, T[]> => {
  const yearMap = new Map<string, T[]>();

  for (const [key, userStats] of userStatsMap) {
    const [, yearId] = key.split("--");

    const group = yearMap.get(yearId) ?? [];
    group.push(userStats);
    yearMap.set(yearId, group);
  }

  return yearMap;
};


export const rankUsersByAttribute = (users: any[], attribute: string, attributeRank: string) => {
  users.sort((a, b) => b[attribute] - a[attribute]);

  let rank = 1;

  users.forEach((user, index) => {
    if (
      index > 0 &&
      user[attribute] < users[index - 1][attribute]
    ) {
      rank = index + 1;
    }
    user[attributeRank] = rank;
  });
};
