export type VoteDirection = -1 | 0 | 1;

/**
 * Move one vote step per click. Switching sides first clears the old vote;
 * the next click can then cast the opposite vote.
 */
export function nextVote(current: VoteDirection, clicked: -1 | 1): VoteDirection {
  return current === 0 ? clicked : 0;
}
