export interface EnvironmentDto {
  id: string;
  slug: string;
  name: string;
  project_id: string;
  created_at: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  slug: string;
}

export interface UpdateEnvironmentRequest {
  name?: string;
}
