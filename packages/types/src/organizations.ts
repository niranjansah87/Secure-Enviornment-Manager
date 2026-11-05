export interface OrganizationDto {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
}
