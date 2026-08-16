import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Rocket } from 'lucide-react';
import { userApi, projectApi } from '../api/endpoints.js';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import Avatar from '../components/ui/Avatar.jsx';
import { PROJECT_COLORS } from '../constants/index.js';
import '../components/projects/projects.css';
import './onboarding.css';

const STEPS = ['Welcome', 'Your profile', 'First project', 'Weekly goal', 'Ready'];

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const toast = useUIStore((s) => s.toast);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    jobTitle: user.jobTitle || '',
    department: user.department || '',
    location: user.location || '',
  });
  const [project, setProject] = useState({ name: '', description: '', color: 'emerald' });
  const [goal, setGoal] = useState(user.weeklyTaskGoal || 20);
  const [createdProject, setCreatedProject] = useState(null);

  const finish = async () => {
    setSaving(true);
    try {
      const { user: updated } = await userApi.updateMe({
        ...profile,
        weeklyTaskGoal: Number(goal),
        onboardingCompleted: true,
      });
      updateUser(updated);
      navigate(createdProject ? `/projects/${createdProject._id}` : '/dashboard', { replace: true });
    } catch (err) {
      toast({ title: 'Could not save your setup', description: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const createProject = async () => {
    if (!project.name.trim()) {
      setStep(3);
      return;
    }
    setSaving(true);
    try {
      const { project: created } = await projectApi.create({
        name: project.name.trim(),
        description: project.description.trim() || undefined,
        color: project.color,
        status: 'active',
      });
      setCreatedProject(created);
      toast({ title: 'Project created', description: created.name, tone: 'success' });
      setStep(3);
    } catch (err) {
      toast({ title: 'Project not created', description: err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 2) return createProject();
    if (step === STEPS.length - 1) return finish();
    setStep((s) => s + 1);
  };

  return (
    <div className="onb">
      <div className="onb__card">
        <div className="onb__steps" role="list">
          {STEPS.map((label, i) => (
            <div key={label} className={`onb__step ${i <= step ? 'is-done' : ''}`} role="listitem">
              <span className="onb__dot">{i < step ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
              <span className="onb__step-label">{label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="onb__panel"
          >
            {step === 0 && (
              <>
                <h1 className="onb__title">Welcome to Orvexa, {user.name.split(' ')[0]}</h1>
                <p className="muted onb__lede">
                  A few quick questions so your dashboard shows something meaningful from the start.
                  You can skip any of it and change everything later in Settings.
                </p>
                <div className="row gap-3" style={{ marginTop: 'var(--sp-6)' }}>
                  <Avatar user={user} size="lg" />
                  <div>
                    <p style={{ fontWeight: 600 }}>{user.name}</p>
                    <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      {user.email} · {user.role}
                    </p>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="onb__title">Tell us about your role</h1>
                <p className="muted onb__lede">This shows on your profile and in the team directory.</p>
                <div className="col gap-4" style={{ marginTop: 'var(--sp-6)' }}>
                  <div className="field">
                    <label className="label" htmlFor="o-title">Job title</label>
                    <input id="o-title" data-autofocus className="input" placeholder="Full-Stack Engineer"
                      value={profile.jobTitle}
                      onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="o-dept">Department</label>
                    <input id="o-dept" className="input" placeholder="Engineering"
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="o-loc">Location</label>
                    <input id="o-loc" className="input" placeholder="Colombo, LK"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="onb__title">Create your first project</h1>
                <p className="muted onb__lede">
                  Projects hold tasks, milestones and members. Leave this blank to skip.
                </p>
                <div className="col gap-4" style={{ marginTop: 'var(--sp-6)' }}>
                  <div className="field">
                    <label className="label" htmlFor="o-pname">Project name</label>
                    <input id="o-pname" className="input" placeholder="Platform Rebuild"
                      value={project.name}
                      onChange={(e) => setProject({ ...project, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="o-pdesc">What is it for?</label>
                    <textarea id="o-pdesc" className="textarea" value={project.description}
                      onChange={(e) => setProject({ ...project, description: e.target.value })} />
                  </div>
                  <fieldset className="field">
                    <legend className="label">Colour</legend>
                    <div className="swatches">
                      {PROJECT_COLORS.map((c) => (
                        <button key={c.value} type="button" aria-label={c.value}
                          className={`swatch ${project.color === c.value ? 'is-active' : ''}`}
                          style={{ background: c.hex }}
                          onClick={() => setProject({ ...project, color: c.value })} />
                      ))}
                    </div>
                  </fieldset>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 className="onb__title">Set a weekly goal</h1>
                <p className="muted onb__lede">
                  How many tasks do you aim to complete each week? Your progress ring measures against
                  this using real completed tasks.
                </p>
                <div className="onb__goal">
                  <input type="range" min="5" max="60" step="1" value={goal}
                    onChange={(e) => setGoal(e.target.value)} className="onb__range"
                    aria-label="Weekly task goal" />
                  <span className="onb__goal-value tabular">{goal}</span>
                </div>
                <p className="field__hint">You can change this any time in Settings.</p>
              </>
            )}

            {step === 4 && (
              <>
                <span className="onb__rocket">
                  <Rocket size={26} />
                </span>
                <h1 className="onb__title">You're set up</h1>
                <p className="muted onb__lede">
                  {createdProject
                    ? `${createdProject.name} is ready. Add a few tasks and your dashboard will start filling in.`
                    : 'Create a project when you are ready and your dashboard will start filling in.'}
                </p>
                <ul className="onb__tips">
                  <li>Press <kbd className="cmd__kbd">Ctrl</kbd> + <kbd className="cmd__kbd">K</kbd> for the command centre</li>
                  <li>Press <kbd className="cmd__kbd">/</kbd> to search everything</li>
                  <li>Press <kbd className="cmd__kbd">?</kbd> to see every shortcut</li>
                </ul>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <footer className="onb__foot">
          {step > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <span />
          )}

          <div className="row gap-2">
            {step > 0 && step < STEPS.length - 1 && (
              <button type="button" className="btn btn--ghost" onClick={() => setStep((s) => s + 1)}>
                Skip
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={next} disabled={saving}>
              {saving ? (
                <span className="spinner" />
              ) : step === STEPS.length - 1 ? (
                <>Start working <ArrowRight size={15} /></>
              ) : (
                <>Continue <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
