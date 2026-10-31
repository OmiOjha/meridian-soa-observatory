window.MERIDIAN_MODEL = {
  countVotes(service) {
    return Object.values(service.votes).filter(Boolean).length;
  },
  score(service, method) {
    const weights = method.weights;
    const voteRatio = this.countVotes(service) / Object.keys(service.votes).length;
    return Math.round((
      service.cohesion * weights.cohesion +
      (1 - service.coupling) * weights.coupling +
      service.reuse * weights.reuse +
      voteRatio * weights.votes
    ) * 100);
  },
  isPromoted(service, method) {
    return this.countVotes(service) >= method.promotionVotes;
  }
};
