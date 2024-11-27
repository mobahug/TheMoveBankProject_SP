import axios from "axios";

export async function getStudies() {
  const response = await axios.get("/api/movebank-data");
  return response.data;
}

export async function getEventData(studyId: string) {
  const response = await axios.get(`/api/movebank-data/${studyId}`);
  return response.data;
}
