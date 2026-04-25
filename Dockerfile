FROM ruby:3.1.4

RUN apt-get update -qq && apt-get install -y nodejs default-mysql-client yarn

WORKDIR /app

COPY Gemfile Gemfile.lock /app/
RUN bundle install

COPY . /app