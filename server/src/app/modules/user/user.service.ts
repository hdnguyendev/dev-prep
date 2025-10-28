
export const UserService = {
  async profile(userId: string) {
    return {
      id: userId,
      clerkUserId: userId,
    };
  },
};
