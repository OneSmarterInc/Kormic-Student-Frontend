import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AgentLiveScreen } from '../src/screens/AgentLiveScreen';
import { GitHubScreen } from '../src/screens/GitHubScreen';
import { LinkedInScreen } from '../src/screens/LinkedInScreen';
import { initialOnboardingState } from '../src/models/onboarding';
import { mockOnboardingServices } from '../src/services/onboardingServices';
import { onboardingReducer } from '../src/state/onboardingReducer';

describe('recommended source skip behavior', () => {
  it('opens GitHub incomplete-profile confirmation before advancing', () => {
    const dispatch = jest.fn();
    const onContinue = jest.fn();
    const screen = render(
      <GitHubScreen
        state={initialOnboardingState}
        services={mockOnboardingServices}
        dispatch={dispatch}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(screen.getByText('Skip for now'));

    expect(screen.getByText('Your profile will be incomplete')).toBeTruthy();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('GitHub primary action keeps the student on the current screen', () => {
    const dispatch = jest.fn();
    const onContinue = jest.fn();
    const screen = render(
      <GitHubScreen
        state={initialOnboardingState}
        services={mockOnboardingServices}
        dispatch={dispatch}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(screen.getByText('Skip for now'));
    fireEvent.press(screen.getByTestId('connect-github-button'));

    expect(onContinue).not.toHaveBeenCalled();
  });

  it('opens LinkedIn incomplete-profile confirmation before advancing', () => {
    const dispatch = jest.fn();
    const onContinue = jest.fn();
    const screen = render(
      <LinkedInScreen
        state={initialOnboardingState}
        services={mockOnboardingServices}
        dispatch={dispatch}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(screen.getByText('Skip for now'));

    expect(screen.getByText('Your profile will be incomplete')).toBeTruthy();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('Skip anyway advances and records the source as skipped', () => {
    const dispatch = jest.fn();
    const onContinue = jest.fn();
    const screen = render(
      <LinkedInScreen
        state={initialOnboardingState}
        services={mockOnboardingServices}
        dispatch={dispatch}
        onContinue={onContinue}
      />,
    );

    fireEvent.press(screen.getByText('Skip for now'));
    fireEvent.press(screen.getByText('Skip anyway'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SKIP_LINKEDIN' });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('skipping both sources lists both missing sources', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'SKIP_GITHUB' });
    state = onboardingReducer(state, { type: 'SKIP_LINKEDIN' });
    const screen = render(<AgentLiveScreen state={state} />);

    expect(screen.getByText('Profile incomplete')).toBeTruthy();
    expect(screen.getByText('Missing: GitHub, LinkedIn')).toBeTruthy();
  });

  it('student can finish with incomplete profile notice visible', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'SKIP_GITHUB' });
    state = onboardingReducer(state, { type: 'NAVIGATE', route: 'AgentLive' });
    const screen = render(<AgentLiveScreen state={state} />);

    expect(state.profileIncomplete).toBe(true);
    expect(screen.getByText('Complete your profile')).toBeTruthy();
  });

  it('does not show incomplete-profile notice when GitHub and LinkedIn are completed', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'SET_GITHUB_CONNECTED', handle: '@priya' });
    state = onboardingReducer(state, {
      type: 'ADD_LINKEDIN_SCREENSHOT',
      screenshot: { id: 'shot-1', label: 'Shot 1' },
    });
    const screen = render(<AgentLiveScreen state={state} />);

    expect(screen.queryByText('Profile incomplete')).toBeNull();
    expect(screen.getByText('Verified student profile')).toBeTruthy();
  });
});
