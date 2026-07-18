class TasksController < ApplicationController
  before_action :require_login
  before_action :set_task, only: %i[show edit update destroy]

  def index
    today = Time.current.in_time_zone("Tokyo").to_date

    @not_done_tasks = current_user.tasks
      .where(done: false)
      .where("date IS NULL OR date = ?", today)

    @done_tasks = current_user.tasks
      .where(done: true)
      .where(completed_at: today.beginning_of_day..today.end_of_day)

    @has_any_tasks = current_user.tasks.exists?
    @today_done_count = @done_tasks.count
    @total_count = current_user.completed_count

    @done_dates = current_user.tasks
      .where(done: true)
      .where.not(completed_at: nil)
      .pluck(:completed_at)
      .map(&:to_date)
      .uniq

    streak = 0
    date = Date.current
    while @done_dates.include?(date)
      streak += 1
      date -= 1.day
    end
    @streak_days = streak

    @week_days = (6.days.ago.to_date..Date.current).map do |d|
      { date: d, done: @done_dates.include?(d), today: d == Date.current }
    end

    @today_coins = current_user.tasks
      .where(done: true)
      .where(completed_at: Time.current.all_day)
      .sum(:coin_reward)

    @week_done_days = @week_days.count { |d| d[:done] }
  end

  def list
    @not_done = current_user.tasks.where(done: false).order(created_at: :desc)
    @done_tasks = current_user.tasks.where(done: true).order(completed_at: :desc)
    @total = @not_done.count + @done_tasks.count
  end

  def show
  end

  def new
    @task = current_user.tasks.build
  end

  def edit
  end

  def create
    @task = current_user.tasks.build(task_params)
    if @task.save
      redirect_to tasks_path, notice: "✨えらい💖"
    else
      render :new
    end
  end

  def update
    ActiveRecord::Base.transaction do
      @task.update!(task_params)

      if @task.saved_change_to_done? && @task.done?
        before_stage = current_user.ribbon_stage
        current_user.increment!(:completed_count)
        current_user.increment!(:coins, @task.coin_reward)
        @task.update!(completed_at: Time.current)

        after_stage = current_user.ribbon_stage
        if after_stage > before_stage
          flash[:evolution_stage]      = after_stage.to_s
          flash[:evolution_first_time] = "true"
        end
      end

      if @task.saved_change_to_done? && !@task.done?
        current_user.decrement!(:completed_count) if current_user.completed_count > 0
        current_user.decrement!(:coins, @task.coin_reward) if current_user.coins >= @task.coin_reward
        @task.update!(completed_at: nil)
      end
    end

    redirect_back fallback_location: tasks_path, notice: "🎉 えらい！がんばり達成！ #{current_user.badge}"
  rescue ActiveRecord::RecordInvalid
    render :edit, status: :unprocessable_entity
  end

  def destroy
    @task.destroy
    redirect_back fallback_location: tasks_path, notice: "削除したよ"
  end

  private

  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  def task_params
    params.require(:task).permit(:title, :done, :priority, :date, :category)
  end
end
