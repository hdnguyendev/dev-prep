/**
 * Generate a random notification message for a newly posted job.
 */
export const getNewJobMessage = (jobTitle: string): string => {
  const messages = [
    `New role opened: ${jobTitle} – the team is hiring!`,
    `New opportunity: ${jobTitle} is now hiring.`,
    `A company you follow just posted: ${jobTitle}.`,
    `Fresh opening: ${jobTitle} is now live.`,
    `${jobTitle} has just been published, check it out.`,
    `Good news: ${jobTitle} is now open for applications.`,
    `New job posted: ${jobTitle}.`,
    `A company you're following has a new role: ${jobTitle}.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)] ?? `New role opened: ${jobTitle} – the team is hiring!`;
};

/**
 * Generate a random notification message for a job that has been closed.
 */
export const getJobClosedMessage = (jobTitle: string): string => {
  const messages = [
    `Job ${jobTitle} is now closed.`,
    `${jobTitle} has finished recruiting.`,
    `The position ${jobTitle} has been closed.`,
    `Job ${jobTitle} is no longer accepting applications.`,
    `${jobTitle} has completed its hiring process.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)] ?? `Job ${jobTitle} is now closed.`;
};

