class TasksController < ApplicationController

  # =====================
  # 共通処理（同じ処理をまとめられる！）
  # =====================
  # show / edit / update / destroy の前に対象のタスクを取得
  before_action :set_task, only: %i[ show edit update destroy ]

  # =====================
  # 一覧表示
  # =====================
  def index
    # 未完了タスク
    @not_done_tasks = Task.where(done: false)

    # 完了タスク
    @done_tasks = Task.where(done: true)
  end

  # =====================
  # 詳細ページ（今回は未使用かな）
  # =====================
  def show
  end

  # =====================
  # 新規作成ページ
  # =====================
  def new
    # 空のタスクを作る（フォーム用）
    @task = Task.new
  end

  # =====================
  # 編集ページ
  # =====================
  def edit
  end

  # =====================
  # タスク作成処理
  # =====================
  def create
    # フォームから送られた値でタスクを作る
    @task = Task.new(task_params)

    if @task.save
      # 保存成功 → 一覧へ＋メッセージ
      redirect_to tasks_path, notice: "✨えらい💖"
    else
      # 失敗 → 入力画面に戻る
      render :new
    end
  end

  # =====================
  # タスク更新処理
  # =====================
  def update
    if @task.update(task_params)
      # 更新成功
      redirect_to tasks_path, notice: "更新したよ"
    else
      # 失敗
      render :edit
    end
  end

  # =====================
  # タスク削除
  # =====================
  def destroy
    @task.destroy

    # 削除後一覧へ
    redirect_to tasks_path, notice: "削除したよ"
  end

  private

  # =====================
  # 対象タスク取得
  # =====================
  def set_task
    # URLのidからタスクを取得する
    @task = Task.find(params[:id])
  end

  # =====================
  # 許可するパラメータ
  # =====================
  def task_params
    # title / done / priority だけ受け取る（セキュリティ）
    params.require(:task).permit(:title, :done, :priority)
  end
end