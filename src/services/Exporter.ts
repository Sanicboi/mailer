import axios, { AxiosResponse } from "axios";
import { amo, CustomFieldID, StatusID } from "../crm";
import { ai } from "./AI";

export class LeadData {
  constructor(
    public readonly username: string,
    public readonly dialog: string,
    public readonly phone: string,
    public readonly inn: string,
  ) {}
}

class Exporter {
  constructor() {}

  public async createLead(data: LeadData): Promise<string> {
    const id = await amo.addDeal([{
      pipeline_id: 9442090,
      status_id: StatusID.Unknown,
      name: data.username,
      custom_fields_values: [
        {
          field_id: CustomFieldID.Dialog,
          values: [{
            value: data.dialog
          }]
        },
        {
          field_id: CustomFieldID.INN,
          values: [{
            value: data.inn
          }]
        },
        {
          field_id: CustomFieldID.Phone,
          values: [{
            value: data.phone
          }]
        },
        {
          field_id: CustomFieldID.Username,
          values: [{
            value: data.username
          }]
        }
      ]
    }]);
    return String(id.id);
  }

  public async editLead(
    data: LeadData,
    id: string
  ): Promise<boolean> {
    const status = await ai.getStatus(data.dialog);
    await amo.editDeal({
      id: +id,
      custom_fields_values: [
        {
          field_id: CustomFieldID.Dialog,
          values: [{
            value: data.dialog
          }]
        }
      ],
      status_id: amo.getStatusId(status.leadStatus),
    });
    return status.dialogueFinished;
  }
}

export const exporter = new Exporter();
