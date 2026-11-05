export interface ProjectDto {
  id: string;
  slug: string;
  name: string;
  org_id: string;
  created_at: string;
}

export interface CreateProjectRequest {
  name: string;
  slug: string;
}

export interface UpdateProjectRequest {
  name?: string;
}
