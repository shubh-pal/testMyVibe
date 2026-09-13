export function publicProject(project: object) {
  return Object.fromEntries(
    Object.entries(project).filter(
      ([key]) => key !== "repoPath" && key !== "repoUrl",
    ),
  );
}
