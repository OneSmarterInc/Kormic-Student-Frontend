import { BasicInfo } from '../models/onboarding';

export type BasicInfoErrors = Partial<Record<keyof BasicInfo, string>>;

const requiredFields: Array<keyof BasicInfo> = [
  'fullName',
  'email',
  'phone',
  'dateOfBirth',
  'college',
  'city',
  'region',
  'country',
  'fieldOfStudy',
  'degreeLevel',
  'yearInCollege',
  'expectedGraduation',
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9][0-9\s().-]{6,19}$/;

const labels: Record<keyof BasicInfo, string> = {
  fullName: 'Enter your full name',
  email: 'Enter your email',
  phone: 'Enter your phone number',
  dateOfBirth: 'Enter your date of birth',
  college: 'Enter your college or university',
  city: 'Enter your city',
  region: 'Enter your state or region',
  country: 'Enter your country',
  fieldOfStudy: 'Enter your field or branch of study',
  degreeLevel: 'Choose your degree level',
  yearInCollege: 'Choose your year in college',
  expectedGraduation: 'Enter your expected graduation',
  interests: 'Choose at least one interest',
  targetDegreeOrField: '',
};

export function validateBasicInfo(info: BasicInfo): BasicInfoErrors {
  const errors: BasicInfoErrors = {};

  requiredFields.forEach((field) => {
    const value = info[field];

    if (typeof value === 'string' && !value.trim()) {
      errors[field] = labels[field];
    }

    if (Array.isArray(value) && value.length === 0) {
      errors[field] = labels[field];
    }
  });

  if (info.email.trim() && !emailPattern.test(info.email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (info.phone.trim() && !phonePattern.test(info.phone.trim())) {
    errors.phone = 'Enter a valid phone number';
  }

  if (info.interests.length === 0) {
    errors.interests = labels.interests;
  }

  return errors;
}

export function isBasicInfoComplete(info: BasicInfo): boolean {
  return Object.keys(validateBasicInfo(info)).length === 0;
}
