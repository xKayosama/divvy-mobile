export type GroupOwner = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type Group = {
  id: string;
  name: string;
  currency: string;
  role: "OWNER" | "MEMBER";
  owner: GroupOwner | null;
  joinedAt: string;
};

export type GroupsResponse = {
  success: true;
  data: {
    groups: Group[];
  };
};

export type CreateGroupRequest = {
  name: string;
};

export type CreateGroupResponse = {
  success: true;
  message: string;
  data: {
    group: {
      _id: string;
      name: string;
      ownerId: string;
      currency: string;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type GroupMember = {
  _id: string;
  groupId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  } | null;
  role: "OWNER" | "MEMBER";
  status: "ACTIVE" | "INACTIVE";
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupMembersResponse = {
  code: number;
  success: true;
  message: string;
  data: {
    members: GroupMember[];
  };
};